(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getArtResolver() {
    return (typeof window !== 'undefined' && window.ArtworkModelResolver) || null;
  }

  function resolveCover(item) {
    const resolver = getArtResolver();
    if (resolver && typeof resolver.preferredCover === 'function') {
      return resolver.preferredCover(item);
    }
    return item?.customCover || item?.cover || '';
  }

  function ShelfBookCard(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ic = window.ic || function () { return null; };
    const {
      item,
      isSelected,
      isSelectMode,
      savedProg,
      updateBadge,
      onCardTouchStart,
      onCardTouchMove,
      onCardTouchEnd,
      onCardClick,
      onContextMenu
    } = props;

    const resumeCh = (savedProg && typeof savedProg.chapterIdx === 'number') ? (savedProg.chapterIdx + 1) : null;
    const pct = savedProg?.pct;
    const newCount = updateBadge ? (updateBadge.newCount ?? updateBadge.count ?? 0) : 0;
    const coverSrc = resolveCover(item);
    const titleStr = window.cleanLabel ? window.cleanLabel(item.title, 'Untitled Book') : (item.title || 'Untitled Book');
    const authorStr = (window.cleanLabel && window.cleanLabel(item.author)) || `${item.chapterCount || 0} chapters`;

    return h('div', {
      key: item.id || item.title,
      className: `omni-poster-card omni-hold-item ${isSelected ? 'selected' : ''}`,
      onMouseDown: (e) => onCardTouchStart(item, e),
      onMouseUp: () => onCardTouchEnd(item),
      onMouseLeave: () => onCardTouchEnd(item),
      onTouchStart: (e) => onCardTouchStart(item, e),
      onTouchMove: (e) => onCardTouchMove(item, e),
      onTouchEnd: () => onCardTouchEnd(item),
      onTouchCancel: () => onCardTouchEnd(item),
      onClick: (e) => onCardClick(item, e),
      onContextMenu: (e) => onContextMenu(item, e)
    },
      h('div', { className: 'omni-poster-frame' },
        isSelectMode && h('div', { className: `omni-poster-check ${isSelected ? 'checked' : ''}` },
          isSelected ? ic(window.Check || 'Check', 12) : null
        ),
        coverSrc ? h('img', {
          src: coverSrc,
          alt: titleStr,
          loading: 'lazy',
          decoding: 'async',
          referrerPolicy: 'no-referrer',
          onError: (e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }
        }) : null,
        h('div', {
          style: {
            display: coverSrc ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(160deg, #16161B 0%, #09090B 100%)',
            color: 'rgba(255, 255, 255, 0.36)',
            padding: 10,
            textAlign: 'center'
          }
        }, ic(window.BookOpen || 'BookOpen', 26)),
        (pct > 0 || resumeCh) && h('div', { className: 'omni-poster-prog-tag' },
          pct > 0 ? `${pct}%` : `Ch.${resumeCh}`
        ),
        newCount > 0 && h('div', { className: 'omni-poster-update-tag' }, `+${newCount}`)
      ),
      h('div', { className: 'omni-poster-title', title: titleStr }, titleStr),
      h('div', { className: 'omni-poster-meta' }, authorStr)
    );
  }

  const MemoizedShelfBookCard = (typeof React !== 'undefined' && React.memo)
    ? React.memo(ShelfBookCard, (prev, next) => {
        return (
          prev.item === next.item &&
          prev.isSelected === next.isSelected &&
          prev.isSelectMode === next.isSelectMode &&
          prev.savedProg?.pct === next.savedProg?.pct &&
          prev.savedProg?.chapterIdx === next.savedProg?.chapterIdx &&
          prev.updateBadge === next.updateBadge
        );
      })
    : ShelfBookCard;

  function TabLibrary(props) {
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ReactObj = typeof React !== 'undefined' ? React : window.React;
    const useState = ReactObj?.useState || function (init) { return [typeof init === 'function' ? init() : init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const useRef = ReactObj?.useRef || function (init) { return { current: init }; };
    const useMemo = ReactObj?.useMemo || function (fn) { return fn(); };

    const toast = window.toast || function () {};
    const ic = window.ic || function () { return null; };
    const omniPrefs = (window.OmniThemeEngine && window.OmniThemeEngine.useOmniPrefs)
      ? window.OmniThemeEngine.useOmniPrefs()
      : { libraryLayout: 'editorial', heroBlur: 24, heroAutoscroll: true, heroInterval: 6 };

    const {
      activeSession,
      activeSessionRef,
      libQuery = '',
      setLibQuery,
      epubRestoreInputRef,
      ongoingEpubInputRef,
      handleRestoreFromEpubFiles,
      handleSelectOngoingEpubFile,
      triggerOngoingEpubPicker: propTriggerOngoingEpubPicker,
      libTab = 'all',
      setLibTab,
      allCountLabel = 0,
      filteredAudiobooks = [],
      savedSpaceCount = 0,
      transCount = 0,
      incCount = 0,
      loadTrashCount,
      trashCount = 0,
      trashList = [],
      savedAudiobooks = [],
      setSavedAudiobooks,
      confirmAction,
      deleteNovelFromHistory,
      setWebImportHistory,
      audioPlayerState,
      setIsFullPlayerOpen,
      handleStartPlayAudiobook,
      handleOpenAudioDownload,
      removeAudiobookFromLibrary,
      displayedBooks = [],
      handleClearSavedSpace,
      handleClearScopedBooks,
      handleCheckAllUpdates,
      isBatchChecking,
      handleCheckNovelUpdate,
      handleDownloadNewChapters,
      handleUpdateTranslateAndMakeEpub,
      toggleNovelSavedSpace,
      savedTranslationSession,
      isTranslationPaused,
      resumeSavedTranslation,
      discardSavedTranslation,
      loadFullNovel,
      setActiveTab,
      setActiveBookMenuNovel,
      setReaderNovelId,
      setReaderNovelTitle,
      setReaderChapterIdx,
      setReaderOpen,
      setReaderChapters = function () {},
      setActiveNovelRecord = function () {},
      setAssembledText,
      setChapters,
      setInputText,
      setTranslatedChapters,
      generateEpubFromChapters,
      getEpubFileName,
      getEpubOptions,
      getNovelFolderOptions,
      saveUniversalBlob,
      setEpubPackagingModal,
      cleanBookTitle,
      cleanBookAuthor,
      handleRestoreNovel,
      handlePermanentDelete,
      clearAllNovelHistory,
      libCollapsed = { books: false, history: false },
      setLibCollapsed,
      history = [],
      filteredHistory = [],
      loadFromHistory,
      deleteHistoryItem,
      clearHistory,
      webImportHistory = [],
      novelUpdateBadges = {}
    } = props;

    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedBookIds, setSelectedBookIds] = useState([]);
    const [libSearchOpen, setLibSearchOpen] = useState(false);
    const [importMenuOpen, setImportMenuOpen] = useState(false);
    const [heroIndex, setHeroIndex] = useState(0);

    const heroTouchRef = useRef({ active: false, startX: 0 });
    const timerRefs = useRef({});
    const longPressTriggered = useRef({});
    const touchStartPos = useRef({});
    const lastLongPressTimeRef = useRef(0);
    const isTouchInteractionRef = useRef(false);

    const [moreSheetOpen, setMoreSheetOpen] = useState(false);
    const [saveNotice, setSaveNotice] = useState(() => window.OmniFeedback?.getLastSaveReady?.() || null);
    const [inlineStatus, setInlineStatus] = useState(null);

    useEffect(() => {
      if (!window.OmniFeedback?.subscribeSaveReady) return;
      return window.OmniFeedback.subscribeSaveReady((info) => setSaveNotice(info));
    }, []);

    // Sync Multi-Select body class + LIFO Back Stack
    useEffect(() => {
      if (typeof window === 'undefined' || !window.OmniBackStack?.push) return;
      if (!moreSheetOpen) return;
      return window.OmniBackStack.push('lib-more-sheet', () => {
        setMoreSheetOpen(false);
        return true;
      });
    }, [moreSheetOpen]);

    useEffect(() => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('is-multi-select', !!isSelectMode);
      }
      if (typeof window === 'undefined') return;
      let popReg = null;
      if (isSelectMode) {
        window.exitLibraryMultiSelect = () => {
          setIsSelectMode(false);
          setSelectedBookIds([]);
          return true;
        };
        if (window.OmniBackStack?.push) {
          popReg = window.OmniBackStack.push('lib-multi-select', () => {
            setIsSelectMode(false);
            setSelectedBookIds([]);
            return true;
          });
        }
      } else if (window.exitLibraryMultiSelect) {
        delete window.exitLibraryMultiSelect;
      }
      return () => {
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('is-multi-select');
        }
        if (typeof popReg === 'function') popReg();
        if (typeof window !== 'undefined' && window.exitLibraryMultiSelect) {
          delete window.exitLibraryMultiSelect;
        }
      };
    }, [isSelectMode]);

    // Cleanup long-press timers on unmount
    useEffect(() => {
      return () => {
        if (timerRefs.current) {
          Object.keys(timerRefs.current).forEach(id => {
            if (timerRefs.current[id]) {
              clearTimeout(timerRefs.current[id]);
              timerRefs.current[id] = null;
            }
          });
          timerRefs.current = {};
        }
      };
    }, []);

    // Reading items & Hero carousel feed
    const readingFeed = useMemo(() => {
      if (!displayedBooks || !displayedBooks.length) return [];
      const withProg = [];
      const others = [];
      for (const b of displayedBooks) {
        const prog = window.getReadingProgress ? window.getReadingProgress(b.id || b.title) : null;
        if (prog && (prog.pct > 0 || prog.chapterIdx > 0)) {
          const ts = prog.updatedAt ? new Date(prog.updatedAt).getTime() : 1;
          withProg.push({ book: b, prog, ts });
        } else {
          others.push({ book: b, prog: null, ts: 0 });
        }
      }
      withProg.sort((a, b) => b.ts - a.ts);
      return withProg.concat(others);
    }, [displayedBooks]);

    const continueList = useMemo(() => {
      return readingFeed.filter(x => x.prog && (x.prog.pct > 0 || x.prog.chapterIdx > 0)).slice(0, 8);
    }, [readingFeed]);

    const heroItems = useMemo(() => {
      return readingFeed.slice(0, 6);
    }, [readingFeed]);

    const latestReadingBook = continueList.length > 0 ? continueList[0] : (readingFeed[0] || null);

    useEffect(() => {
      if (heroIndex >= heroItems.length && heroItems.length > 0) {
        setHeroIndex(0);
      }
    }, [heroItems.length, heroIndex]);

    // Optional Chimanew Hero auto-advance timer (pauses on touch)
    useEffect(() => {
      const showEditorialHero = omniPrefs.libraryLayout !== 'minimal' && !isSelectMode && libTab !== 'audio' && libTab !== 'trash' && !libQuery && heroItems.length > 1;
      if (!showEditorialHero || !omniPrefs.heroAutoscroll) return;
      const ms = Math.max(3000, Math.min(15000, (Number(omniPrefs.heroInterval) || 6) * 1000));
      const iv = setInterval(() => {
        if (!heroTouchRef.current.active) {
          setHeroIndex(prev => (prev + 1) % heroItems.length);
        }
      }, ms);
      return () => clearInterval(iv);
    }, [omniPrefs.libraryLayout, omniPrefs.heroAutoscroll, omniPrefs.heroInterval, isSelectMode, libTab, libQuery, heroItems.length]);

    const openReaderForBook = async (item) => {
      const full = await loadFullNovel(item);
      if (!full) { toast('Novel data not found in local store.', 'error'); return; }
      if (typeof setActiveNovelRecord === 'function') {
        setActiveNovelRecord(full);
      }
      const isTrans = !!item.isTranslated || !!full.isTranslated || (item.title || '').includes('(Translated)');
      let chs = [];
      if (isTrans && Array.isArray(full.translatedChapters) && full.translatedChapters.length > 0) {
        chs = full.translatedChapters;
      } else {
        chs = (Array.isArray(full.rawChapters) && full.rawChapters.length > 0)
          ? full.rawChapters
          : ((Array.isArray(full.chapters) && full.chapters.length > 0)
            ? full.chapters
            : (full.translatedChapters || []));
      }
      const hasAnyText = chs.some(c => c && (c.text || c.content) && (c.text || c.content).trim().length > 0);
      if (!hasAnyText) {
        let blob = full.epubBlob || item.epubBlob || null;
        if (!blob && (full.fileUri || full.displayPath || item.fileUri || item.displayPath) && window.NativeBridge && window.NativeBridge.readEpubFile) {
          try {
            blob = await window.NativeBridge.readEpubFile({
              fileUri: full.fileUri || item.fileUri || '',
              displayPath: full.displayPath || item.displayPath || '',
              fileName: full.fileName || item.fileName || ''
            });
          } catch (_) {}
        }
        if (blob) {
          try {
            setInlineStatus({ tone: 'neutral', message: 'Unpacking book contents...' });
            const readFn = (typeof window.readEpub === 'function') ? window.readEpub : (window.DocumentParser?.parseFile || window.DocumentParser?.readEpub);
            if (readFn) {
              const parsed = await readFn(blob);
              if (parsed && parsed.chapters && parsed.chapters.length > 0) {
                chs = parsed.chapters;
                if (full.id && window.GeminiNovelDB) {
                  window.GeminiNovelDB.updateNovel(full.id, {
                    rawChapters: parsed.chapters,
                    chapters: parsed.chapters,
                    epubBlob: blob
                  }).catch(() => {});
                }
              }
            }
          } catch (err) {
            console.error('Failed to unpack EPUB for reader:', err);
          }
        }
      }
      if (chs.length === 0 || !chs.some(c => c && (c.text || c.content) && (c.text || c.content).trim().length > 0)) {
        toast('No chapter text available yet. Open Book Details -> Continue Fetching Online.', 'warning');
        return;
      }
      const cleanCh = (c) => {
        const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
        const raw = c?.text || c?.content || '';
        return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
      };
      const cleanedChs = chs.map(c => ({
        title: c.title,
        content: cleanCh(c),
        text: cleanCh(c),
        originalTitle: c.originalTitle || c.title,
        arc: c.arc || c.volume || '',
        volume: c.volume || c.arc || '',
        level: c.level !== undefined ? c.level : 1,
        images: Array.isArray(c.images) ? c.images : [],
        isTranslated: Boolean(c.isTranslated || isTrans)
      }));
      setReaderChapters(cleanedChs);
      if (isTrans) {
        setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n\n'));
        setTranslatedChapters(cleanedChs);
        if (full.originalChapters && full.originalChapters.length > 0) {
          const srcChs = full.originalChapters;
          setInputText(srcChs.map(c => `# ${c.title}\n\n${cleanCh(c)}`).join('\n\n\n'));
          setChapters(srcChs.map(c => ({ title: c.title, content: cleanCh(c), text: cleanCh(c) })));
        } else {
          setInputText('');
          setChapters(cleanedChs);
        }
      } else {
        setAssembledText('');
        setTranslatedChapters([]);
        setInputText(cleanedChs.map(c => `# ${c.title}\n\n${cleanCh(c)}`).join('\n\n\n'));
        setChapters(cleanedChs);
      }
      const novelKey = item.id || item.title;
      setReaderNovelId(novelKey);
      setReaderNovelTitle(item.title);
      const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
      const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
      setReaderChapterIdx(resumeIdx);
      setReaderOpen(true);
    };

    const toggleSelectBook = (id) => {
      if (!id) return;
      setSelectedBookIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const getSelectionPool = () => {
      if (libTab === 'trash') return Array.isArray(trashList) ? trashList : [];
      if (libTab === 'audio') return Array.isArray(filteredAudiobooks) ? filteredAudiobooks : [];
      return Array.isArray(displayedBooks) ? displayedBooks : [];
    };

    const selectAllBooks = () => {
      setSelectedBookIds(getSelectionPool().map(b => b.id || b.url || b.title).filter(Boolean));
    };

    const invertSelectedBooks = () => {
      const allIds = getSelectionPool().map(b => b.id || b.url || b.title).filter(Boolean);
      setSelectedBookIds(prev => allIds.filter(id => !prev.includes(id)));
    };

    const deselectAllBooks = () => {
      setSelectedBookIds([]);
    };

    const getSelectedBookObjects = () => {
      return displayedBooks.filter(b => selectedBookIds.includes(b.id) || selectedBookIds.includes(b.title));
    };

    const handleBatchSaveSpace = async () => {
      const targets = getSelectedBookObjects();
      if (targets.length === 0) return;
      const shouldSave = targets.some(b => !b.savedToSpace);
      for (const b of targets) {
        const currentlySaved = !!b.savedToSpace;
        if (currentlySaved !== shouldSave && typeof toggleNovelSavedSpace === 'function') {
          try { await toggleNovelSavedSpace(b.id, b); } catch (_) {}
        }
      }
      setInlineStatus({
        tone: 'success',
        message: `${shouldSave ? 'Saved' : 'Removed'} ${targets.length} book${targets.length === 1 ? '' : 's'} ${shouldSave ? 'to' : 'from'} Saved Space`
      });
    };

    const handleBatchCheckSelectedUpdates = async () => {
      const targets = getSelectedBookObjects().filter(b => b.sourceUrl && /^https?:\/\//i.test(b.sourceUrl));
      if (targets.length === 0) {
        setInlineStatus({ tone: 'neutral', message: 'Selected books have no web source URL.' });
        return;
      }
      setInlineStatus({ tone: 'neutral', message: `Checking updates for ${targets.length} book${targets.length === 1 ? '' : 's'}...` });
      for (const b of targets) {
        if (typeof handleCheckNovelUpdate === 'function') {
          try { await handleCheckNovelUpdate(b); } catch (_) {}
        }
      }
      setInlineStatus({ tone: 'success', message: `Finished update check (${targets.length} checked)` });
    };

    const handleBatchExportSelectedEpubs = async () => {
      const targets = getSelectedBookObjects();
      if (targets.length === 0) return;
      for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        try {
          const full = loadFullNovel ? await loadFullNovel(item) : item;
          if (!full) continue;
          if (full.epubBlob && !full.isEdited && typeof saveUniversalBlob === 'function') {
            const fname = full.fileName || ((full.title || 'Book').replace(/\.epub$/i, '') + '.epub');
            await saveUniversalBlob(full.epubBlob, fname, 'application/epub+zip', false, getNovelFolderOptions ? getNovelFolderOptions(full) : {});
            continue;
          }
          const chs = (full.translatedChapters && full.translatedChapters.length > 0) ? full.translatedChapters : (full.chapters || []);
          if (!chs.length || typeof generateEpubFromChapters !== 'function') continue;
          const baseTitle = cleanBookTitle ? cleanBookTitle(full.title || item.title, chs) : (full.title || item.title || 'Book');
          const author = cleanBookAuthor ? cleanBookAuthor(full.author || item.author) : (full.author || item.author || 'Author');
          if (setEpubPackagingModal) setEpubPackagingModal({ title: `${baseTitle} (${i + 1}/${targets.length})`, status: 'Packaging EPUB...', pct: 45 });
          const opts = getEpubOptions ? getEpubOptions({ novelId: full.id || baseTitle, coverUrl: resolveCover(full) }) : { coverUrl: resolveCover(full) };
          const blob = await generateEpubFromChapters(chs, baseTitle, author, 'en', null, opts);
          const epubName = getEpubFileName ? getEpubFileName(baseTitle, chs.length, full.isIncomplete) : `${baseTitle}.epub`;
          if (typeof saveUniversalBlob === 'function') {
            await saveUniversalBlob(blob, epubName, 'application/epub+zip', false, getNovelFolderOptions ? getNovelFolderOptions(full) : {});
          }
        } catch (err) {
          console.warn('[Library] Batch export error:', item?.title, err);
        }
      }
      if (setEpubPackagingModal) setEpubPackagingModal(null);
      setInlineStatus({ tone: 'success', message: `Exported ${targets.length} EPUB${targets.length === 1 ? '' : 's'}` });
    };

    const deleteSelectedBooks = () => {
      if (selectedBookIds.length === 0) return;
      const idsSnapshot = [...selectedBookIds];
      const count = idsSnapshot.length;
      const doDelete = async () => {
        for (const id of idsSnapshot) {
          try {
            if (deleteNovelFromHistory) {
              await deleteNovelFromHistory(id);
            } else if (window.LibraryEngine?.Controller?.moveToTrash) {
              await window.LibraryEngine.Controller.moveToTrash(id, {
                setWebImportHistory,
                loadTrashCount,
                toast
              });
            }
          } catch (delErr) {
            console.warn('[LibraryTab] Error deleting book:', id, delErr);
          }
        }
        if (typeof setWebImportHistory === 'function') {
          setWebImportHistory(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.filter(item => !idsSnapshot.includes(item.id) && !idsSnapshot.includes(item.title));
          });
        }
        setSelectedBookIds([]);
        setIsSelectMode(false);
        if (typeof loadTrashCount === 'function') loadTrashCount();
        if (window.OmniFeedback && typeof window.OmniFeedback.showUndo === 'function') {
          window.OmniFeedback.showUndo(`Moved ${count} book${count === 1 ? '' : 's'} to Trash`, async () => {
            for (const rid of idsSnapshot) {
              if (typeof handleRestoreNovel === 'function') {
                try { await handleRestoreNovel(rid); } catch (_) {}
              }
            }
          });
        }
      };

      if (typeof confirmAction === 'function') {
        confirmAction(`Move ${count} selected book(s) to Trash?`, doDelete);
      } else {
        doDelete();
      }
    };

    const handleCardContextMenu = (item, e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = item.id || item.title;
      if (longPressTriggered.current[id]) return;
      if (!isSelectMode) {
        setIsSelectMode(true);
      }
      toggleSelectBook(id);
    };

    const handleCardTouchStart = (item, e) => {
      const isTouch = Boolean(e.touches || e.changedTouches || e.type === 'touchstart');
      if (isTouch) {
        isTouchInteractionRef.current = true;
      } else if (isTouchInteractionRef.current && e.type === 'mousedown') {
        return;
      }
      const id = item.id || item.title;
      if (timerRefs.current[id]) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
      longPressTriggered.current[id] = false;
      const t = e.touches ? e.touches[0] : e;
      touchStartPos.current[id] = { x: t?.clientX || 0, y: t?.clientY || 0 };
      timerRefs.current[id] = setTimeout(() => {
        longPressTriggered.current[id] = true;
        lastLongPressTimeRef.current = Date.now();
        if (typeof window !== 'undefined' && window.NativeBridge?.vibrate) {
          try { window.NativeBridge.vibrate(25); } catch (_) {}
        } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(25); } catch (_) {}
        }
        if (!isSelectMode) {
          setIsSelectMode(true);
        }
        toggleSelectBook(id);
      }, 360);
    };

    const handleCardTouchMove = (item, e) => {
      const id = item.id || item.title;
      if (!timerRefs.current[id]) return;
      const t = e.touches ? e.touches[0] : e;
      const start = touchStartPos.current[id] || { x: 0, y: 0 };
      if (Math.abs((t?.clientX || 0) - start.x) > 12 || Math.abs((t?.clientY || 0) - start.y) > 12) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
    };

    const handleCardTouchEnd = (item) => {
      const id = item.id || item.title;
      if (timerRefs.current[id]) {
        clearTimeout(timerRefs.current[id]);
        timerRefs.current[id] = null;
      }
      if (longPressTriggered.current[id]) {
        setTimeout(() => { longPressTriggered.current[id] = false; }, 160);
      }
    };

    const handleCardClick = (item, e) => {
      const id = item.id || item.title;
      if (longPressTriggered.current[id]) {
        longPressTriggered.current[id] = false;
        if (e) {
          e.preventDefault?.();
          e.stopPropagation?.();
        }
        return;
      }
      if (isSelectMode) {
        toggleSelectBook(id);
      } else if (typeof setActiveBookMenuNovel === 'function') {
        setActiveBookMenuNovel(item);
      } else {
        openReaderForBook(item);
      }
    };

    const triggerOngoingEpubPicker = typeof propTriggerOngoingEpubPicker === 'function'
      ? propTriggerOngoingEpubPicker
      : () => ongoingEpubInputRef?.current?.click();

    const hasWebSources = webImportHistory.some(b => b.sourceUrl && b.sourceUrl.startsWith('http'));
    const useEditorialHero = omniPrefs.libraryLayout !== 'minimal' && !isSelectMode && libTab !== 'audio' && libTab !== 'trash' && !libQuery && heroItems.length > 0;

    function renderIconToolbar(translucent) {
      const cls = translucent ? 'omni-circle-btn translucent' : 'omni-circle-btn';
      return h('div', { className: 'omni-header-actions' },
        hasWebSources && h('button', {
          type: 'button',
          className: cls,
          disabled: isBatchChecking,
          title: 'Check All Online Updates',
          onClick: handleCheckAllUpdates
        }, ic(window.RefreshCw || 'RefreshCw', 16, isBatchChecking ? 'animate-spin' : '')),
        h('button', {
          type: 'button',
          className: `${cls} ${importMenuOpen ? 'active' : ''}`,
          title: 'Import EPUB or Discover Books',
          onClick: () => setImportMenuOpen(v => !v)
        }, ic(window.Plus || 'Plus', 17)),
        h('button', {
          type: 'button',
          className: `${cls} ${isSelectMode ? 'active' : ''}`,
          title: 'Multi-Select Books',
          onClick: () => {
            setIsSelectMode(prev => !prev);
            setSelectedBookIds([]);
          }
        }, ic(window.Check || 'Check', 16)),
        h('button', {
          type: 'button',
          className: `${cls} ${(libSearchOpen || libQuery) ? 'active' : ''}`,
          title: 'Search Library',
          onClick: () => setLibSearchOpen(v => !v)
        }, ic(window.Search || 'Search', 16))
      );
    }

    function renderHeroCarousel() {
      const activeEntry = heroItems[heroIndex % heroItems.length] || heroItems[0];
      if (!activeEntry) return null;
      const b = activeEntry.book;
      const prog = activeEntry.prog;
      const resolver = getArtResolver();
      const bannerInfo = resolver ? resolver.preferredBanner(b) : { src: b.cover || '', mode: b.cover ? 'cover' : 'glow' };
      const coverSrc = resolveCover(b);
      const titleStr = window.cleanLabel ? window.cleanLabel(b.title, 'Untitled Book') : (b.title || 'Untitled Book');
      const authorStr = (window.cleanLabel && window.cleanLabel(b.author)) || '';
      const pct = prog?.pct || 0;
      const chNum = (prog && typeof prog.chapterIdx === 'number') ? (prog.chapterIdx + 1) : 1;
      const totalCh = b.chapterCount || (b.chapters ? b.chapters.length : 0);

      return h('div', {
        className: `omni-hero omni-hold-item ${(selectedBookIds.includes(b.id) || selectedBookIds.includes(b.title)) ? 'is-selected' : ''}`,
        onMouseDown: (e) => {
          if (e.target && e.target.closest && e.target.closest('button')) return;
          handleCardTouchStart(b, e);
        },
        onMouseUp: () => handleCardTouchEnd(b),
        onMouseLeave: () => handleCardTouchEnd(b),
        onTouchStart: (e) => {
          heroTouchRef.current = { active: true, startX: e.touches?.[0]?.clientX || 0 };
          if (e.target && e.target.closest && e.target.closest('button')) return;
          handleCardTouchStart(b, e);
        },
        onTouchMove: (e) => handleCardTouchMove(b, e),
        onTouchCancel: () => { heroTouchRef.current.active = false; handleCardTouchEnd(b); },
        onTouchEnd: (e) => {
          handleCardTouchEnd(b);
          const endX = e.changedTouches?.[0]?.clientX || 0;
          const dx = endX - heroTouchRef.current.startX;
          heroTouchRef.current.active = false;
          if (Math.abs(dx) > 42 && heroItems.length > 1) {
            if (dx < 0) setHeroIndex(prev => (prev + 1) % heroItems.length);
            else setHeroIndex(prev => (prev - 1 + heroItems.length) % heroItems.length);
          }
        },
        onContextMenu: (e) => handleCardContextMenu(b, e)
      },
        h('div', { className: 'omni-hero-bg' },
          bannerInfo.src ? h('img', {
            src: bannerInfo.src,
            alt: '',
            referrerPolicy: 'no-referrer',
            style: resolver ? resolver.getBannerImgStyle(b, omniPrefs.heroBlur) : {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${omniPrefs.heroBlur}px) saturate(1.18)`
            }
          }) : h('div', { className: 'omni-hero-glow' })
        ),
        h('div', { className: 'omni-hero-vignette' }),
        h('div', { className: 'omni-hero-topbar' },
          h('span', { className: 'omni-hero-brand' }, 'Library'),
          renderIconToolbar(true)
        ),
        h('div', { className: 'omni-hero-content' },
          h('div', {
            className: 'omni-hero-cover-wrap',
            onClick: () => setActiveBookMenuNovel ? setActiveBookMenuNovel(b) : openReaderForBook(b)
          },
            h('div', { className: 'omni-poster-frame' },
              coverSrc ? h('img', { src: coverSrc, alt: titleStr, referrerPolicy: 'no-referrer' }) : h('div', {
                style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }
              }, ic(window.BookOpen || 'BookOpen', 30))
            )
          ),
          h('div', { className: 'omni-hero-meta' },
            h('div', { className: 'omni-hero-kicker' }, pct > 0 ? 'Continue Reading' : 'In Library'),
            h('div', {
              className: 'omni-hero-title',
              onClick: () => setActiveBookMenuNovel ? setActiveBookMenuNovel(b) : openReaderForBook(b)
            }, titleStr),
            h('div', { className: 'omni-hero-sub' },
              `${authorStr ? authorStr + ' · ' : ''}Ch. ${chNum}${totalCh > 0 ? ` / ${totalCh}` : ''}${pct > 0 ? ` · ${pct}%` : ''}`
            ),
            h('div', { className: 'omni-hero-prog-track' },
              h('div', { className: 'omni-hero-prog-fill', style: { width: `${Math.max(4, pct)}%` } })
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', {
                type: 'button',
                className: 'omni-hero-continue-btn',
                onClick: () => openReaderForBook(b)
              }, ic(window.Play || 'Play', 12), pct > 0 ? `Continue Ch. ${chNum}` : 'Read Now'),
              h('button', {
                type: 'button',
                className: 'omni-flat-icon-btn',
                style: { width: 'auto', height: 35, marginTop: 10, padding: '0 12px', fontSize: 12 },
                onClick: () => setActiveBookMenuNovel && setActiveBookMenuNovel(b)
              }, 'Details')
            )
          )
        ),
        heroItems.length > 1 && h('div', { className: 'omni-hero-dots' },
          heroItems.map((entry, idx) => h('button', {
            key: entry.book.id || idx,
            type: 'button',
            className: `omni-hero-dot ${idx === (heroIndex % heroItems.length) ? 'active' : ''}`,
            'aria-label': `Hero slide ${idx + 1}`,
            onClick: () => setHeroIndex(idx)
          }))
        )
      );
    }

    function renderContinueRail() {
      if (omniPrefs.libraryLayout === 'minimal' || continueList.length === 0 || isSelectMode || libTab === 'audio' || libTab === 'trash' || libQuery) {
        return null;
      }
      return h(React.Fragment, null,
        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, 'Continue Reading'),
          h('span', { style: { fontSize: 11, color: 'rgba(255,255,255,0.4)' } }, `${continueList.length} active`)
        ),
        h('div', { className: 'omni-continue-rail' },
          continueList.map(({ book, prog }, idx) => {
            const cSrc = resolveCover(book);
            const pct = prog?.pct || 0;
            const chNum = (prog?.chapterIdx || 0) + 1;
            const tStr = window.cleanLabel ? window.cleanLabel(book.title, 'Untitled Book') : (book.title || 'Untitled Book');
            const cId = book.id || book.title;
            const cSel = selectedBookIds.includes(book.id) || selectedBookIds.includes(book.title);
            return h('div', {
              key: cId || idx,
              className: `omni-continue-card omni-hold-item ${cSel ? 'is-selected' : ''}`,
              onMouseDown: (e) => handleCardTouchStart(book, e),
              onMouseUp: () => handleCardTouchEnd(book),
              onMouseLeave: () => handleCardTouchEnd(book),
              onTouchStart: (e) => handleCardTouchStart(book, e),
              onTouchMove: (e) => handleCardTouchMove(book, e),
              onTouchEnd: () => handleCardTouchEnd(book),
              onTouchCancel: () => handleCardTouchEnd(book),
              onContextMenu: (e) => handleCardContextMenu(book, e),
              onClick: (e) => {
                if (longPressTriggered.current[cId]) {
                  longPressTriggered.current[cId] = false;
                  e.preventDefault?.();
                  return;
                }
                if (isSelectMode) toggleSelectBook(cId);
                else openReaderForBook(book);
              }
            },
              cSrc && h('img', { src: cSrc, alt: '', className: 'omni-continue-card-bg', referrerPolicy: 'no-referrer' }),
              h('div', { className: 'omni-continue-card-scrim' }),
              h('div', { className: 'omni-poster-frame', style: { width: 54, height: 81, position: 'relative', zIndex: 2 } },
                cSrc ? h('img', { src: cSrc, alt: tStr, referrerPolicy: 'no-referrer' }) : ic(window.BookOpen || 'BookOpen', 20)
              ),
              h('div', { style: { position: 'relative', zIndex: 2, flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#F5F5F5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.25 } }, tStr),
                h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.58)', marginTop: 4 } }, `Ch. ${chNum}${pct > 0 ? ` · ${pct}%` : ''}`),
                h('div', { className: 'omni-hero-prog-track', style: { marginTop: 7 } },
                  h('div', { className: 'omni-hero-prog-fill', style: { width: `${Math.max(5, pct)}%` } })
                )
              )
            );
          })
        )
      );
    }

    function renderMinimalContinueCard() {
      if (omniPrefs.libraryLayout !== 'minimal' || !latestReadingBook || isSelectMode || libTab === 'audio' || libTab === 'trash' || libQuery) {
        return null;
      }
      const { book, prog } = latestReadingBook;
      const cSrc = resolveCover(book);
      const pct = prog?.pct || 0;
      const chNum = (prog?.chapterIdx || 0) + 1;
      const tStr = window.cleanLabel ? window.cleanLabel(book.title, 'Untitled Book') : (book.title || 'Untitled Book');

      return h('div', {
        className: `omni-continue-card compact-wide omni-hold-item ${(selectedBookIds.includes(book.id) || selectedBookIds.includes(book.title)) ? 'is-selected' : ''}`,
        onMouseDown: (e) => handleCardTouchStart(book, e),
        onMouseUp: () => handleCardTouchEnd(book),
        onMouseLeave: () => handleCardTouchEnd(book),
        onTouchStart: (e) => handleCardTouchStart(book, e),
        onTouchMove: (e) => handleCardTouchMove(book, e),
        onTouchEnd: () => handleCardTouchEnd(book),
        onTouchCancel: () => handleCardTouchEnd(book),
        onContextMenu: (e) => handleCardContextMenu(book, e),
        onClick: (e) => {
          const bId = book.id || book.title;
          if (longPressTriggered.current[bId]) {
            longPressTriggered.current[bId] = false;
            e.preventDefault?.();
            return;
          }
          if (isSelectMode) toggleSelectBook(bId);
          else openReaderForBook(book);
        }
      },
        cSrc && h('img', { src: cSrc, alt: '', className: 'omni-continue-card-bg', referrerPolicy: 'no-referrer' }),
        h('div', { className: 'omni-continue-card-scrim' }),
        h('div', { className: 'omni-poster-frame', style: { width: 52, height: 78, position: 'relative', zIndex: 2 } },
          cSrc ? h('img', { src: cSrc, alt: tStr, referrerPolicy: 'no-referrer' }) : ic(window.BookOpen || 'BookOpen', 20)
        ),
        h('div', { style: { position: 'relative', zIndex: 2, flex: 1, minWidth: 0 } },
          h('div', { className: 'omni-hero-kicker', style: { marginBottom: 2 } }, 'Continue Reading'),
          h('div', { style: { fontSize: 15, fontWeight: 750, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, tStr),
          h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.58)', marginTop: 3 } },
            `Chapter ${chNum}${pct > 0 ? ` · ${pct}%` : ''}`
          ),
          h('div', { className: 'omni-hero-prog-track', style: { marginTop: 7 } },
            h('div', { className: 'omni-hero-prog-fill', style: { width: `${Math.max(4, pct)}%` } })
          )
        ),
        h('button', {
          type: 'button',
          className: 'omni-flat-cta',
          style: { flex: 'none', height: 34, padding: '0 13px', fontSize: 12, position: 'relative', zIndex: 2 },
          onClick: (e) => { e.stopPropagation(); openReaderForBook(book); }
        }, ic(window.Play || 'Play', 12), 'Resume')
      );
    }

    function renderBookshelfGrid() {
      if (displayedBooks.length === 0) {
        return h('div', { style: { textAlign: 'center', padding: '56px 16px' } },
          h('div', { style: { color: 'rgba(255,255,255,0.28)', display: 'flex', justifyContent: 'center', marginBottom: 14 } },
            ic(window.BookOpen || 'BookOpen', 34)
          ),
          h('div', { style: { fontSize: 16.5, fontWeight: 700, color: '#F5F5F5' } },
            libQuery
              ? 'No books match your search'
              : libTab === 'saved'
                ? 'Your Saved Space is empty'
                : libTab === 'translated'
                  ? 'No translated books yet'
                  : libTab === 'incomplete'
                    ? 'No incomplete crawls found'
                    : 'Your Library is empty'
          ),
          h('p', { style: { fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 340, margin: '8px auto 20px', lineHeight: 1.5 } },
            libQuery
              ? `Nothing found for "${libQuery}".`
              : 'Discover novels online or restore existing EPUB files into your local shelf.'
          ),
          !libQuery && h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              className: 'omni-flat-cta',
              style: { flex: 'none', padding: '0 18px', height: 40 },
              onClick: () => setActiveTab('web_importer')
            }, ic(window.Globe || 'Globe', 14), 'Discover Novels'),
            h('button', {
              type: 'button',
              className: 'omni-flat-icon-btn',
              style: { width: 'auto', padding: '0 16px', height: 40, fontSize: 12.5, fontWeight: 600, gap: 6 },
              onClick: () => epubRestoreInputRef.current?.click()
            }, ic(window.Download || 'Download', 14), 'Restore EPUB')
          )
        );
      }

      return h(React.Fragment, null,
        renderMinimalContinueCard(),
        renderContinueRail(),
        h('div', { className: 'omni-poster-grid' },
          displayedBooks.map((item, idx) => {
            const savedProg = window.getReadingProgress ? window.getReadingProgress(item.id || item.title) : null;
            const updateBadge = (novelUpdateBadges && (novelUpdateBadges[item.id] || novelUpdateBadges[item.title])) || null;
            const isSelected = selectedBookIds.includes(item.id) || selectedBookIds.includes(item.title);

            return h(MemoizedShelfBookCard, {
              key: item.id || idx,
              item,
              isSelected,
              isSelectMode,
              savedProg,
              updateBadge,
              onCardTouchStart: handleCardTouchStart,
              onCardTouchMove: handleCardTouchMove,
              onCardTouchEnd: handleCardTouchEnd,
              onCardClick: handleCardClick,
              onContextMenu: handleCardContextMenu
            });
          })
        )
      );
    }

    return h(React.Fragment, null,
      // 1. Top Header or Chimanew Hero or OmniTrack Multi-Select TopBar
      isSelectMode
        ? h('div', { className: 'omni-select-topbar' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              h('button', {
                type: 'button',
                className: 'p-icon-btn',
                'aria-label': 'Exit selection mode',
                onClick: () => { setIsSelectMode(false); setSelectedBookIds([]); }
              }, ic(window.X || 'X', 19)),
              h('div', { style: { fontWeight: 700, fontSize: 16, color: 'var(--p-ink)' } },
                `${selectedBookIds.length} selected`
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 2 } },
              h('button', {
                type: 'button',
                className: 'p-icon-btn',
                title: 'Select All',
                'aria-label': 'Select All',
                onClick: selectAllBooks
              }, ic(window.CheckSquare || window.Check || 'Check', 18)),
              h('button', {
                type: 'button',
                className: 'p-icon-btn',
                title: 'Invert Selection',
                'aria-label': 'Invert Selection',
                onClick: invertSelectedBooks
              }, ic(window.Shuffle || window.RefreshCw || 'RefreshCw', 17))
            )
          )
        : (useEditorialHero
            ? renderHeroCarousel()
            : h('div', { className: 'omni-page-hd' },
                h('div', null,
                  h('h1', { className: 'omni-page-title' }, 'Library')
                ),
                renderIconToolbar(false)
              )),

      // 2. Quick "+" Import Drawer (Frameless Hairline Rows — hidden inputs live in AppTabsContainer)
      importMenuOpen && !isSelectMode && h('div', { style: { marginBottom: 10, borderTop: '0.6px solid var(--omni-hairline)' } },
        h('div', { className: 'omni-hairline-row', onClick: () => { setImportMenuOpen(false); epubRestoreInputRef.current?.click(); } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            ic(window.Download || 'Download', 17),
            h('div', null,
              h('div', { style: { fontSize: 13.5, fontWeight: 650, color: '#F5F5F5' } }, 'Restore EPUB Files'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, 'Re-import local EPUB files into your offline library')
            )
          ),
          ic(window.ChevronRight || 'ChevronRight', 15)
        ),
        h('div', { className: 'omni-hairline-row', onClick: () => { setImportMenuOpen(false); triggerOngoingEpubPicker(); } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            ic(window.Zap || 'Zap', 17),
            h('div', null,
              h('div', { style: { fontSize: 13.5, fontWeight: 650, color: '#F5F5F5' } }, 'Continue Ongoing EPUB'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, 'Scan online sources and append newly released chapters')
            )
          ),
          ic(window.ChevronRight || 'ChevronRight', 15)
        ),
        h('div', { className: 'omni-hairline-row', onClick: () => { setImportMenuOpen(false); setActiveTab('web_importer'); } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            ic(window.Globe || 'Globe', 17),
            h('div', null,
              h('div', { style: { fontSize: 13.5, fontWeight: 650, color: '#F5F5F5' } }, 'Discover Web Novels & Audiobooks'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, 'Browse sources or paste a novel chapter link')
            )
          ),
          ic(window.ChevronRight || 'ChevronRight', 15)
        )
      ),

      // 3. Flat Search Bar (Shown when Search tapped or query non-empty)
      (libSearchOpen || Boolean(libQuery)) && h('div', { className: 'omni-search-bar' },
        ic(window.Search || 'Search', 15),
        h('input', {
          type: 'text',
          placeholder: 'Search library by title or author...',
          value: libQuery,
          onChange: (e) => setLibQuery(e.target.value)
        }),
        h('button', {
          type: 'button',
          className: 'omni-circle-btn',
          style: { width: 26, height: 26 },
          onClick: () => {
            setLibQuery('');
            setLibSearchOpen(false);
          }
        }, ic(window.X || 'X', 12))
      ),

      // 4. Clean Chimanew Underline Shelf Tabs (Zero Bubble/Pill Shapes)
      h('div', { className: 'omni-underline-tabs', style: { marginBottom: 8 } },
        [
          { id: 'all', label: `All (${allCountLabel})` },
          { id: 'saved', label: `Saved (${savedSpaceCount})` },
          { id: 'translated', label: `Translated (${transCount})` },
          { id: 'incomplete', label: `Incomplete (${incCount})` },
          { id: 'audio', label: `Audio (${filteredAudiobooks.length})` },
          { id: 'trash', label: `Trash (${trashCount})` }
        ].map(tab => h('button', {
          key: tab.id,
          type: 'button',
          className: `omni-underline-tab ${libTab === tab.id ? 'active' : ''}`,
          onClick: () => {
            setLibTab(tab.id);
            setSelectedBookIds([]);
            if (tab.id === 'trash') loadTrashCount();
          }
        }, tab.label))
      ),

      saveNotice && window.OmniInlineStrip && h(window.OmniInlineStrip, {
        message: `Saved ${saveNotice.fileName || 'Document'}`,
        tone: 'success',
        actionLabel: 'Open',
        onAction: () => {
          try { window.NativeBridge?.openWithReader?.(saveNotice.fileName, saveNotice.path || ''); } catch (_) {}
          setSaveNotice(null);
        },
        onDismiss: () => setSaveNotice(null)
      }),

      inlineStatus && window.OmniInlineStrip && h(window.OmniInlineStrip, {
        message: inlineStatus.message,
        tone: inlineStatus.tone,
        onDismiss: () => setInlineStatus(null)
      }),

      // 5. Audio Shelf (Frameless Hairline List with Hold-to-Select)
      libTab === 'audio' && h(React.Fragment, null,
        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, `Saved Audiobooks (${filteredAudiobooks.length})`),
          savedAudiobooks.length > 0 && h('button', {
            type: 'button',
            className: 'omni-soft-tab',
            style: { color: '#F87171', padding: '4px 8px' },
            onClick: () => confirmAction('Clear all saved audiobooks from your library?', () => {
              setSavedAudiobooks([]);
              try { localStorage.removeItem('gemini_saved_audiobooks'); } catch (_) {}
              setInlineStatus({ tone: 'neutral', message: 'Audiobook library cleared' });
            })
          }, 'Clear All')
        ),
        filteredAudiobooks.length === 0
          ? h('div', { style: { textAlign: 'center', padding: '44px 16px' } },
              h('div', { style: { color: 'rgba(255,255,255,0.28)', display: 'flex', justifyContent: 'center', marginBottom: 10 } }, ic('Headphones', 34)),
              h('div', { style: { fontSize: 15, fontWeight: 700, color: '#F5F5F5' } }, libQuery ? 'No audiobooks match your search.' : 'No saved audiobooks yet.'),
              h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.48)', marginTop: 6 } },
                'Search audiobooks in Discover and save any book here for quick playback.'
              )
            )
          : h('div', null,
              filteredAudiobooks.map((b, idx) => {
                const isCurrentlyPlaying = audioPlayerState?.isPlaying && audioPlayerState?.currentBook?.url === b.url;
                const aId = b.id || b.url || b.title;
                const aSel = selectedBookIds.includes(aId);
                const holdItem = Object.assign({}, b, { id: aId });
                return h('div', {
                  key: aId || idx,
                  className: `omni-hairline-row omni-hold-item ${aSel ? 'is-selected' : ''}`,
                  onMouseDown: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    handleCardTouchStart(holdItem, e);
                  },
                  onMouseUp: () => handleCardTouchEnd(holdItem),
                  onMouseLeave: () => handleCardTouchEnd(holdItem),
                  onTouchStart: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    handleCardTouchStart(holdItem, e);
                  },
                  onTouchMove: (e) => handleCardTouchMove(holdItem, e),
                  onTouchEnd: () => handleCardTouchEnd(holdItem),
                  onTouchCancel: () => handleCardTouchEnd(holdItem),
                  onContextMenu: (e) => handleCardContextMenu(holdItem, e),
                  onClick: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    if (longPressTriggered.current[aId]) {
                      longPressTriggered.current[aId] = false;
                      return;
                    }
                    if (isSelectMode) toggleSelectBook(aId);
                  }
                },
                  h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, position: 'relative' } },
                    h('div', { className: 'omni-poster-frame', style: { width: 46, height: 69, position: 'relative' } },
                      aSel && h('div', { className: 'omni-hold-check' }, ic(window.Check || 'Check', 12)),
                      b.cover ? h('img', { src: b.cover, alt: 'Cover', referrerPolicy: 'no-referrer' }) : ic('Headphones', 18)
                    ),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 14, fontWeight: 700, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, b.title),
                      h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 } },
                        `${b.author ? `by ${b.author} · ` : ''}${b.totalTracks || (b.tracks ? b.tracks.length : '?')} tracks`
                      ),
                      b.lastPlayedTrackTitle && h('div', { style: { fontSize: 11, color: 'var(--omni-accent)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, b.lastPlayedTrackTitle)
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } },
                    h('button', {
                      type: 'button',
                      className: 'omni-circle-btn active',
                      title: isCurrentlyPlaying ? 'Pause' : 'Play',
                      onClick: () => {
                        if (isCurrentlyPlaying) window.SwiftAudioEngine?.Player?.pause();
                        else if (audioPlayerState?.currentBook?.url === b.url) { window.SwiftAudioEngine?.Player?.play(); setIsFullPlayerOpen(true); }
                        else handleStartPlayAudiobook(b, b.lastPlayedTrackIndex || 0);
                      }
                    }, ic(isCurrentlyPlaying ? 'Pause' : 'Play', 15)),
                    h('button', {
                      type: 'button',
                      className: 'omni-circle-btn',
                      title: 'Download MP3s',
                      onClick: () => handleOpenAudioDownload(b)
                    }, ic('Download', 15)),
                    h('button', {
                      type: 'button',
                      className: 'omni-circle-btn',
                      style: { color: '#F87171' },
                      title: 'Remove audiobook',
                      onClick: () => confirmAction(`Remove "${b.title}" from your Library?`, () => removeAudiobookFromLibrary(b))
                    }, ic('Trash2', 14))
                  )
                );
              })
            )
      ),

      // 6. Recycle Bin Shelf (Frameless Hairline Rows)
      libTab === 'trash' && h(React.Fragment, null,
        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, `Recycle Bin (${trashList.length})`),
          trashList.length > 0 && h('div', { style: { display: 'flex', gap: 6 } },
            h('button', {
              type: 'button',
              className: 'omni-soft-tab active',
              style: { color: '#34D399' },
              onClick: () => confirmAction(`Restore all ${trashList.length} deleted novel(s)?`, handleRestoreAllTrash)
            }, 'Restore All'),
            h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171' },
              onClick: () => confirmAction('Permanently delete all items in Recycle Bin? This cannot be undone.', handleEmptyTrash)
            }, 'Empty Bin')
          )
        ),
        trashList.length === 0
          ? h('div', { style: { textAlign: 'center', padding: '44px 16px' } },
              h('div', { style: { color: 'rgba(255,255,255,0.28)', display: 'flex', justifyContent: 'center', marginBottom: 10 } }, ic('Trash2', 34)),
              h('div', { style: { fontSize: 15, fontWeight: 700, color: '#F5F5F5' } }, 'Recycle Bin is empty.'),
              h('p', { style: { fontSize: 12.5, color: 'rgba(255,255,255,0.48)', marginTop: 6 } }, 'Deleted novels remain recoverable here until permanently removed.')
            )
          : h('div', null,
              trashList.map((item, idx) => {
                const tId = item.id || item.title;
                const tSel = selectedBookIds.includes(tId);
                return h('div', {
                  key: tId || idx,
                  className: `omni-hairline-row omni-hold-item ${tSel ? 'is-selected' : ''}`,
                  onMouseDown: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    handleCardTouchStart(item, e);
                  },
                  onMouseUp: () => handleCardTouchEnd(item),
                  onMouseLeave: () => handleCardTouchEnd(item),
                  onTouchStart: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    handleCardTouchStart(item, e);
                  },
                  onTouchMove: (e) => handleCardTouchMove(item, e),
                  onTouchEnd: () => handleCardTouchEnd(item),
                  onTouchCancel: () => handleCardTouchEnd(item),
                  onContextMenu: (e) => handleCardContextMenu(item, e),
                  onClick: (e) => {
                    if (e.target && e.target.closest && e.target.closest('button')) return;
                    if (longPressTriggered.current[tId]) {
                      longPressTriggered.current[tId] = false;
                      return;
                    }
                    if (isSelectMode) toggleSelectBook(tId);
                  }
                },
                h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 } },
                  h('div', { className: 'omni-poster-frame', style: { width: 42, height: 63, position: 'relative' } },
                    tSel && h('div', { className: 'omni-hold-check' }, ic(window.Check || 'Check', 12)),
                    item.cover ? h('img', { src: item.cover, alt: 'Cover', referrerPolicy: 'no-referrer' }) : ic('BookOpen', 16)
                  ),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 14, fontWeight: 650, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, item.title || 'Untitled Book'),
                    h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)', marginTop: 2 } },
                      `${item.chapterCount || (item.chapters ? item.chapters.length : 0)} chapters · Deleted ${item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'recently'}`
                    )
                  )
                ),
                h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } },
                  h('button', {
                    type: 'button',
                    className: 'omni-circle-btn',
                    style: { color: '#34D399' },
                    title: 'Restore to Library',
                    onClick: () => handleRestoreNovel(item.id)
                  }, ic('RotateCcw', 14)),
                  h('button', {
                    type: 'button',
                    className: 'omni-circle-btn',
                    style: { color: '#F87171' },
                    title: 'Delete Permanently',
                    onClick: () => confirmAction(`Permanently delete "${item.title}"?`, () => handlePermanentDelete(item.id))
                  }, ic('Trash2', 14))
                )
              );
              })
            )
      ),

      // 7. Main Book Shelf (All / Saved / Translated / Incomplete)
      libTab !== 'audio' && libTab !== 'trash' && h(React.Fragment, null,
        (savedTranslationSession || isTranslationPaused || activeSessionRef?.current) && (libTab === 'all' || libTab === 'incomplete' || libTab === 'saved') && (() => {
          const s = savedTranslationSession || activeSessionRef?.current || activeSession;
          if (!s) return null;
          const cCount = s.completedCount || 0;
          const tCount = s.total || s.totalChunks || '?';
          const isDelta = Boolean(s.isDeltaUpdate);
          const deltaLabel = `Ch ${s.deltaStart || (cCount + 1)}-${s.deltaEnd || tCount}`;
          return h('div', { className: 'omni-hairline-row', style: { borderTop: '0.6px solid var(--omni-hairline)', flexWrap: 'wrap', marginBottom: 10 } },
            h('div', { style: { flex: 1, minWidth: 170 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--omni-accent)' } },
                isDelta ? `Update Staged · ${deltaLabel}` : `Paused Translation · ${cCount} / ${tCount}`
              ),
              h('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 } }, s.title || 'Translation Session')
            ),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', {
                type: 'button',
                className: 'omni-flat-cta',
                style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 },
                onClick: () => { setActiveTab('text'); resumeSavedTranslation(s); }
              }, 'Resume'),
              h('button', {
                type: 'button',
                className: 'omni-soft-tab',
                style: { color: '#F87171' },
                onClick: () => discardSavedTranslation(s.id)
              }, 'Discard')
            )
          );
        })(),

        !libCollapsed.books && renderBookshelfGrid(),

        // Scoped shelf maintenance link (subtle footer rather than loud button row)
        displayedBooks.length > 0 && !isSelectMode && h('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 6px', borderTop: '0.6px solid var(--omni-hairline)', marginTop: 6 }
        },
          h('span', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.42)' } },
            `${displayedBooks.length} book${displayedBooks.length === 1 ? '' : 's'} shown`
          ),
          h('div', { style: { display: 'flex', gap: 10 } },
            libTab === 'incomplete' && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171', padding: '4px 8px', fontSize: 11.5 },
              onClick: () => confirmAction(`Move all ${displayedBooks.length} incomplete crawl(s) to Recycle Bin?`, () => handleClearScopedBooks(displayedBooks, 'incomplete'))
            }, 'Clear Incomplete'),
            libTab === 'saved' && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171', padding: '4px 8px', fontSize: 11.5 },
              onClick: () => confirmAction(`Remove ${displayedBooks.length} book(s) from Saved Space?`, () => handleClearSavedSpace(displayedBooks))
            }, 'Clear Saved Space'),
            libTab === 'translated' && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171', padding: '4px 8px', fontSize: 11.5 },
              onClick: () => confirmAction(`Move all ${displayedBooks.length} translated novel(s) to Recycle Bin?`, () => handleClearScopedBooks(displayedBooks, 'translated'))
            }, 'Clear Translated'),
            libTab === 'all' && webImportHistory.length > 0 && h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171', padding: '4px 8px', fontSize: 11.5 },
              onClick: () => confirmAction(`Move all ${webImportHistory.length} library books into Recycle Bin?`, () => clearAllNovelHistory())
            }, 'Move All to Trash')
          )
        ),

        // Translation History collapsible list
        history.length > 0 && h('div', { style: { marginTop: 14 } },
          h('div', { className: 'omni-section-label-row', style: { cursor: 'pointer' }, onClick: () => setLibCollapsed(s => ({ ...s, history: !s.history })) },
            h('span', { className: 'omni-section-label' }, `${libCollapsed.history ? '+' : '-'} Quick Text History (${filteredHistory.length})`),
            h('button', {
              type: 'button',
              className: 'omni-soft-tab',
              style: { color: '#F87171', padding: '2px 8px', fontSize: 11 },
              onClick: (e) => { e.stopPropagation(); clearHistory(); }
            }, 'Clear')
          ),
          !libCollapsed.history && filteredHistory.map(entry => h('div', { key: entry.id, className: 'omni-hairline-row' },
            h('div', { style: { flex: 1, minWidth: 0 }, onClick: () => loadFromHistory(entry) },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#F5F5F5' } },
                `${entry.srcLang || 'Auto'} -> ${entry.tgtLang} · ${new Date(entry.ts).toLocaleDateString()}`
              ),
              entry.outputPreview && h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 } }, entry.outputPreview)
            ),
            h('button', {
              type: 'button',
              className: 'omni-circle-btn',
              style: { width: 30, height: 30, color: '#F87171' },
              onClick: () => deleteHistoryItem(entry.id)
            }, ic('Trash2', 13))
          ))
        )
      ),

      // 8. OmniTrack Flush Vector Multi-Select Bottom Dock
      isSelectMode && h('div', { className: 'omni-select-dock' },
        libTab === 'trash'
          ? h(React.Fragment, null,
              h('button', {
                type: 'button',
                className: 'omni-select-dock-btn',
                disabled: selectedBookIds.length === 0,
                onClick: async () => {
                  const snap = [...selectedBookIds];
                  for (const id of snap) {
                    if (typeof handleRestoreNovel === 'function') {
                      try { await handleRestoreNovel(id); } catch (_) {}
                    }
                  }
                  setSelectedBookIds([]);
                  setIsSelectMode(false);
                }
              }, ic('RotateCcw', 17), h('span', null, 'Restore')),
              h('button', {
                type: 'button',
                className: 'omni-select-dock-btn is-danger',
                disabled: selectedBookIds.length === 0,
                onClick: () => confirmAction(`Permanently delete ${selectedBookIds.length} book(s)?`, async () => {
                  const snap = [...selectedBookIds];
                  for (const id of snap) {
                    if (typeof handlePermanentDelete === 'function') {
                      try { await handlePermanentDelete(id); } catch (_) {}
                    }
                  }
                  setSelectedBookIds([]);
                  setIsSelectMode(false);
                })
              }, ic('Trash2', 17), h('span', null, 'Delete')),
              h('button', {
                type: 'button',
                className: 'omni-select-dock-btn',
                onClick: () => { setIsSelectMode(false); setSelectedBookIds([]); }
              }, ic('X', 17), h('span', null, 'Done'))
            )
          : (libTab === 'audio'
              ? h(React.Fragment, null,
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn is-danger',
                    disabled: selectedBookIds.length === 0,
                    onClick: () => confirmAction(`Remove ${selectedBookIds.length} audiobook(s)?`, () => {
                      const snap = [...selectedBookIds];
                      for (const track of filteredAudiobooks) {
                        const tid = track.id || track.url || track.title;
                        if (snap.includes(tid) && typeof removeAudiobookFromLibrary === 'function') {
                          removeAudiobookFromLibrary(track);
                        }
                      }
                      setSelectedBookIds([]);
                      setIsSelectMode(false);
                    })
                  }, ic('Trash2', 17), h('span', null, 'Remove')),
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn',
                    onClick: () => { setIsSelectMode(false); setSelectedBookIds([]); }
                  }, ic('X', 17), h('span', null, 'Done'))
                )
              : h(React.Fragment, null,
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn',
                    disabled: selectedBookIds.length === 0,
                    onClick: handleBatchCheckSelectedUpdates
                  }, ic('RefreshCw', 17), h('span', null, 'Updates')),
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn',
                    disabled: selectedBookIds.length === 0,
                    onClick: handleBatchSaveSpace
                  }, ic('Star', 17), h('span', null, 'Save')),
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn',
                    disabled: selectedBookIds.length === 0,
                    onClick: handleBatchExportSelectedEpubs
                  }, ic('Download', 17), h('span', null, 'EPUB')),
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn is-danger',
                    disabled: selectedBookIds.length === 0,
                    onClick: deleteSelectedBooks
                  }, ic('Trash2', 17), h('span', null, 'Trash')),
                  h('button', {
                    type: 'button',
                    className: 'omni-select-dock-btn',
                    onClick: () => setMoreSheetOpen(true)
                  }, ic(window.MoreHorizontal || 'MoreHorizontal', 17), h('span', null, 'More'))
                ))
      ),

      // Multi-Select "More" Bottom Sheet
      moreSheetOpen && h('div', {
        className: 'omni-sheet-backdrop',
        onClick: (e) => { if (e.target === e.currentTarget) setMoreSheetOpen(false); }
      },
        h('div', { className: 'omni-sheet' },
          h('div', { className: 'p-sheet-handle' }),
          h('div', { className: 'p-section-label' }, 'Batch & Shelf Actions'),
          hasWebSources && h('button', {
            type: 'button',
            className: 'p-row',
            onClick: () => { setMoreSheetOpen(false); handleCheckAllUpdates(); }
          }, ic('RefreshCw', 17), h('div', { className: 'p-row-title' }, 'Check All Online Books')),
          h('button', {
            type: 'button',
            className: 'p-row',
            onClick: () => { setMoreSheetOpen(false); selectAllBooks(); }
          }, ic('Check', 17), h('div', { className: 'p-row-title' }, 'Select All In Current Shelf')),
          h('button', {
            type: 'button',
            className: 'p-row',
            onClick: () => { setMoreSheetOpen(false); invertSelectedBooks(); }
          }, ic('RefreshCw', 17), h('div', { className: 'p-row-title' }, 'Invert Selection')),
          h('button', {
            type: 'button',
            className: 'p-row',
            onClick: () => { setMoreSheetOpen(false); deselectAllBooks(); }
          }, ic('X', 17), h('div', { className: 'p-row-title' }, 'Clear Selection'))
        )
      )
    );
  }

  return { TabLibrary };
}));
