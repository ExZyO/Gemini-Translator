/**
 * app_tab_importer.js - Discover & Web Novel Importer Component for Gemini Translator
 * OmniTrack Pure-AMOLED Editorial UI with dual Discover layouts (3-Col Grid & Spotlight/Rails),
 * smart Search/URL bar, blurred-artwork active crawl header, and continuous hairline chapter rows.
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

  function SourcesInfoModal(props) {
    const { isOpen, onClose } = props || {};
    if (!isOpen) return null;
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const ic = (typeof window !== 'undefined' && window.ic) || function () { return null; };

    const groupBlock = (iconName, title, desc, bullets) => h('div', {
      style: { padding: '14px 0', borderBottom: '0.6px solid var(--omni-hairline)' }
    },
      h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--omni-accent)', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 } },
        ic(iconName, 15), title
      ),
      h('p', { style: { color: 'rgba(255,255,255,0.72)', margin: '0 0 6px 0', fontSize: 12.5 } }, desc),
      h('ul', { style: { margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.5)', fontSize: 12 } },
        bullets.map((b, i) => h('li', { key: i, style: { marginBottom: 3 } }, b))
      )
    );

    return h('div', { className: 'omni-details-screen', style: { zIndex: 9999 } },
      h('div', { className: 'omni-details-inner', style: { padding: '0 16px 40px' } },
        h('div', { className: 'omni-details-topbar', style: { paddingLeft: 0, paddingRight: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h('button', { type: 'button', className: 'omni-circle-btn', onClick: onClose }, ic('ArrowLeft', 18)),
            h('div', null,
              h('div', { style: { fontSize: 17, fontWeight: 750, color: '#F5F5F5' } }, 'Supported Built-in Sources'),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } }, 'Zero-login search catalogs, web serials & audiobooks')
            )
          )
        ),
        groupBlock('BookOpen', 'Light Novels', 'Direct access to English Light Novel catalogs with illustrations and volume structure.', [
          'Lnori Catalog: 1-click clean EPUB download, volume separation, covers, and metadata.',
          'Supports direct EPUB compilation or chapter scraping straight into Translate.'
        ]),
        groupBlock('Globe', 'Web Novels', 'Built-in parsers for major web serialization platforms, fan archives, and aggregators.', [
          'Web Platforms: NovelBuddy, NovelFire, RoyalRoad, NovelBin, ReadNovelFull, ScribbleHub, Wattpad.',
          'Archives & International: AO3, Pixiv, Syosetu, Kakuyomu, Lofter, Curated Archives.',
          'Extensible Source Plugins & Custom Site Recipes for any other website URL.'
        ]),
        groupBlock('Headphones', 'Audiobooks', 'Free streaming and offline MP3 chapter downloads for spoken audiobooks.', [
          'SwiftAudiobooks & IPAudio with in-app player, playback speed (0.5x - 2.5x), sleep timer, and batch downloads.'
        ]),
        groupBlock('Library', 'Books & Published Literature', 'Multi-catalog search across free public domain books and digital archives.', [
          'Project Gutenberg, Standard Ebooks, Library Genesis, Open Library & Internet Archive.'
        ]),
        h('div', { style: { paddingTop: 16 } },
          h('button', { type: 'button', className: 'omni-flat-cta', style: { width: '100%' }, onClick: onClose }, 'Close')
        )
      )
    );
  }

  function TabImporter(props) {
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null);
    const useState = ReactObj?.useState || function (init) { return [typeof init === 'function' ? init() : init, function () {}]; };
    const useEffect = ReactObj?.useEffect || function () {};
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function () {};
    const ic = (typeof window !== 'undefined' && window.ic) || props?.ic || function () { return null; };
    const omniPrefs = (window.OmniThemeEngine && window.OmniThemeEngine.useOmniPrefs)
      ? window.OmniThemeEngine.useOmniPrefs()
      : { discoverLayout: 'grid', heroBlur: 24 };

    const {
      webImportUrl,
      setWebImportUrl,
      webImportStatus,
      webImportError,
      setWebImportError,
      isFetchingUrl,
      isFetchingPaused,
      activeCrawlSession,
      activeNovelView,
      setActiveNovelRecord,
      novelSearchResults,
      setNovelSearchResults,
      novelSearchFilter,
      setNovelSearchFilter,
      isSearchingNovels,
      isSearchResultsCollapsed,
      setIsSearchResultsCollapsed,
      swiftAudioResults,
      setSwiftAudioResults,
      isSwiftAudioMode,
      setIsSwiftAudioMode,
      isSwiftAudioSearching,
      bookSearchResults,
      setBookSearchResults,
      isBookSearchMode,
      setIsBookSearchMode,
      isSearchingBooks,
      bookSearchFilter,
      setBookSearchFilter,
      handleSearchBooks,
      handleDownloadBookEpub,
      collapsedVolumes,
      setCollapsedVolumes,
      isAiSorting,
      epubPackagingModal,
      setEpubPackagingModal,
      epubIncludeImages,
      setEpubIncludeImages,
      scrapeImages,
      setScrapeImages,
      webImportHistory,
      handleStartFetch,
      handlePauseFetch,
      handleCancelFetch,
      handleResetImportTab,
      dismissCrawlSession,
      handleSearchNovels,
      handleSwiftAudioSearch,
      handleOpenSourcePluginsModal,
      openSiteRecipeEditor,
      handleCheckRezeroUpdates,
      handleOpenAutoGlossary,
      handleLnoriDirectEpubDownload,
      exportCleanLnoriEpub,
      handleStartPlayAudiobook,
      handleOpenAudioDownload,
      handleMassDownloadPlaylist,
      handleSetNovelFolder,
      toggleNovelSavedSpace,
      autoSortImportChapters,
      reverseImportChapters,
      aiReorderImportChapters,
      moveImportChapter,
      moveImportChapterToEdge,
      removeImportChapter,
      checkAndApplyNovelGlossary,
      loadFullNovel,
      getCustomTitle,
      setRenameModalNovel,
      setNewNovelTitleInput,
      setActiveTab,
      setInputText,
      setChapters,
      setTranslatedChapters,
      setAssembledText,
      setReaderNovelId,
      setReaderNovelTitle,
      setReaderChapterIdx,
      setReaderOpen,
      setReaderChapters,
      setCurrentDocCover,
      setCurrentDocTitle,
      setFileName,
      ongoingEpubInputRef,
      cleanBookTitle = (typeof window !== 'undefined' && window.cleanBookTitle) || ((t) => t),
      cleanBookAuthor = (typeof window !== 'undefined' && window.cleanBookAuthor) || ((a) => a),
      generateEpubFromChapters = (typeof window !== 'undefined' && window.generateEpubFromChapters),
      getEpubFileName = (typeof window !== 'undefined' && window.getEpubFileName) || ((t) => `${t}.epub`),
      getEpubOptions = (typeof window !== 'undefined' && window.getEpubOptions) || (() => ({})),
      getNovelFolderOptions = (typeof window !== 'undefined' && window.getNovelFolderOptions) || (() => ({})),
      saveUniversalBlob = (typeof window !== 'undefined' && window.saveUniversalBlob)
    } = props || {};

    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
    const [lofterAuth, setLofterAuth] = useState(null);
    const [showLofterModal, setShowLofterModal] = useState(false);
    const [isLofterConnecting, setIsLofterConnecting] = useState(false);
    const [booksDownloadableOnly, setBooksDownloadableOnly] = useState(true);
    const [isScoutingUrl, setIsScoutingUrl] = useState(false);
    const [scoutStatusText, setScoutStatusText] = useState('');
    const [crawlerSpeedMode, setCrawlerSpeedMode] = useState(() => {
      try { return localStorage.getItem('gemini_crawler_speed_mode') || 'builtin'; } catch (_) { return 'builtin'; }
    });
    const [isFlatChapterView, setIsFlatChapterView] = useState(() => {
      try { return localStorage.getItem('gemini_flat_chapter_view') === 'true'; } catch (_) { return false; }
    });
    const [importCategoryTab, setImportCategoryTab] = useState(() => {
      if (isBookSearchMode) return 'books';
      if (isSwiftAudioMode) return 'audio';
      if (novelSearchFilter === 'Lnori') return 'ln';
      return 'wn';
    });

    useEffect(() => {
      let active = true;
      (async () => {
        try {
          if (window.GeminiNovelDB?.getSiteAuth) {
            const auth = await window.GeminiNovelDB.getSiteAuth('lofter');
            if (active) setLofterAuth(auth);
          }
        } catch (_) {}
      })();
      const handleShare = (e) => {
        const text = e.detail?.text || window._pendingSharedText;
        if (!text) return;
        window._pendingSharedText = null;
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        setWebImportUrl(urlMatch ? urlMatch[0] : text);
        toast?.('Shared link loaded into Discover.', 'info');
      };
      window.addEventListener('incoming-android-share', handleShare);
      if (window._pendingSharedText) handleShare({ detail: { text: window._pendingSharedText } });
      return () => {
        active = false;
        window.removeEventListener('incoming-android-share', handleShare);
      };
    }, []);

    useEffect(() => {
      if (novelSearchFilter === 'all' && importCategoryTab === 'ln') setImportCategoryTab('wn');
      else if (novelSearchFilter === 'Lnori' && importCategoryTab !== 'ln') setImportCategoryTab('ln');
    }, [novelSearchFilter]);

    const handleLofterInAppLogin = async () => {
      setIsLofterConnecting(true);
      try {
        if (window.NativeBridge?.openLofterLoginSheet) {
          const res = await window.NativeBridge.openLofterLoginSheet();
          if (res?.success) {
            setLofterAuth(await window.GeminiNovelDB.getSiteAuth('lofter'));
            toast?.('Lofter session connected.', 'success');
            setShowLofterModal(false);
          } else toast?.(res?.error || 'Login cancelled.', 'info');
        } else {
          window.open('https://www.lofter.com/front/login', '_blank');
          toast?.('Opened Lofter login. Paste your cookie in the manual box after logging in.', 'info');
        }
      } catch (err) {
        toast?.('Login error: ' + (err.message || err), 'error');
      } finally {
        setIsLofterConnecting(false);
      }
    };

    const handleSaveLofterCookie = async (rawCookie) => {
      const trimmed = (rawCookie || '').trim();
      if (!trimmed) return toast?.('Please paste a cookie string first.', 'warning');
      try {
        await window.GeminiNovelDB?.saveSiteAuth?.('lofter', { siteId: 'lofter', cookieString: trimmed, updatedAt: new Date().toISOString() });
        await window.NativeBridge?.setSiteCookie?.('https://www.lofter.com', trimmed);
        setLofterAuth(await window.GeminiNovelDB?.getSiteAuth?.('lofter'));
        toast?.('Lofter cookie saved.', 'success');
        setShowLofterModal(false);
      } catch (e) { toast?.('Failed to save cookie: ' + e.message, 'error'); }
    };

    const handleDisconnectLofter = async () => {
      try {
        await window.GeminiNovelDB?.deleteSiteAuth?.('lofter');
        setLofterAuth(null);
        toast?.('Lofter session disconnected.', 'info');
      } catch (e) { toast?.('Failed to disconnect: ' + e.message, 'error'); }
    };

    const toggleCrawlerSpeedMode = () => {
      const next = crawlerSpeedMode === 'builtin' ? 'recipe' : 'builtin';
      setCrawlerSpeedMode(next);
      try { localStorage.setItem('gemini_crawler_speed_mode', next); } catch (_) {}
      toast?.(next === 'builtin' ? 'Fast Built-in Speed enabled' : 'Safe Recipe Delay enabled', 'info');
    };

    const getSafeChapters = (obj) => {
      if (!obj) return [];
      const chs = Array.isArray(obj.chapters) ? obj.chapters : (obj.chapters && typeof obj.chapters === 'object' ? Object.values(obj.chapters).filter(c => c && typeof c === 'object') : []);
      const rawChs = Array.isArray(obj.rawChapters) ? obj.rawChapters : [];
      const transChs = Array.isArray(obj.translatedChapters) ? obj.translatedChapters : [];
      const chsHasText = chs.some(c => c && ((c.text || c.content || '').length > 20));
      const rawHasText = rawChs.some(c => c && ((c.text || c.content || '').length > 20));
      const transHasText = transChs.some(c => c && ((c.text || c.content || '').length > 20));
      if (rawHasText && (!chsHasText || rawChs.length >= chs.length)) return rawChs;
      if (transHasText && (!chsHasText || transChs.length >= chs.length)) return transChs;
      if (chs.length > 0) {
        if (rawChs.length > 0 && !chsHasText) {
          return chs.map((c, i) => {
            const match = rawChs[i] || rawChs.find(rc => rc.title === c.title || (rc.url && rc.url === c.url));
            return { ...c, text: c.text || c.content || match?.text || match?.content || '', content: c.content || c.text || match?.content || match?.text || '' };
          });
        }
        return chs;
      }
      return rawChs.length > 0 ? rawChs : transChs;
    };

    const getSafeChapterCount = (obj) => {
      if (!obj) return 0;
      const chs = getSafeChapters(obj);
      if (chs.length > 0) return chs.length;
      return (typeof obj.chapters === 'number' ? obj.chapters : null) || obj.totalChapterCount || obj.chapterCount || (Array.isArray(obj.chapterList) ? obj.chapterList.length : 0);
    };

    const exportNovelAsEpub = async (targetObj) => {
      const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(targetObj) : null) || targetObj;
      const chs = getSafeChapters(full).length > 0 ? getSafeChapters(full) : getSafeChapters(targetObj);
      if (!chs.length) return toast('No chapters available to export.', 'warning');
      const novelTitle = (cleanBookTitle(full.title || targetObj.title, chs) || full.title || targetObj.title || 'Web Novel').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      const novelAuthor = (cleanBookAuthor(full.author || targetObj.author) || full.author || targetObj.author || 'Author').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      const fixedName = full?.fileName || targetObj?.fileName;
      const isInc = full.isIncomplete || targetObj?.isIncomplete || (targetObj?.totalChapterCount && chs.length < targetObj.totalChapterCount);
      try {
        if (full && full.epubBlob && !full.isEdited && !targetObj?.isEdited) {
          const fname = fixedName || getEpubFileName(novelTitle, chs.length, isInc);
          await saveUniversalBlob(full.epubBlob, fname, 'application/epub+zip', false, getNovelFolderOptions(targetObj || full));
          toast(`EPUB downloaded (${chs.length} chapters).`, 'success');
          return;
        }
        setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters...`, pct: 5 });
        const opts = getEpubOptions({ novelId: targetObj?.id || targetObj?.sourceUrl || novelTitle, coverUrl: targetObj?.cover || '', fixedFilename: fixedName });
        const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
          setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
        }, opts);
        const epubFileName = fixedName || getEpubFileName(novelTitle, chs.length, isInc);
        await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(targetObj || full));
        toast(`EPUB downloaded (${chs.length} chapters).`, 'success');
      } catch (e) {
        toast('EPUB export error: ' + e.message, 'error');
      } finally {
        setEpubPackagingModal(null);
      }
    };

    const openNovelInReader = async (targetObj) => {
      const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(targetObj) : null) || targetObj;
      const chs = getSafeChapters(full);
      if (!chs.length) return toast('No chapters available to read yet.', 'warning');
      const isTrans = !!full?.isTranslated || !!targetObj?.isTranslated;
      const mappedChs = chs.map((c, idx) => ({
        title: c.title || `Chapter ${idx + 1}`,
        text: c.text || c.content || '',
        content: c.text || c.content || '',
        originalTitle: c.originalTitle || c.title || `Chapter ${idx + 1}`,
        arc: c.arc || c.volume || '',
        volume: c.volume || c.arc || '',
        level: c.level !== undefined ? c.level : 1,
        images: Array.isArray(c.images) ? c.images : [],
        isTranslated: Boolean(c.isTranslated || isTrans)
      }));
      setChapters(mappedChs);
      setTranslatedChapters(isTrans ? mappedChs : []);
      setAssembledText(isTrans ? mappedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n\n') : '');
      setReaderChapters?.(mappedChs);
      setActiveNovelRecord?.(full);
      const novelKey = full?.id || targetObj?.id || targetObj?.title || 'web_import_novel';
      setReaderNovelId(novelKey);
      setReaderNovelTitle(full?.title || targetObj?.title || 'Web Novel');
      const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
      const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
      setReaderChapterIdx(resumeIdx);
      setReaderOpen(true);
    };

    const sendNovelToTranslator = async (targetObj) => {
      const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(targetObj) : null) || targetObj;
      const chs = getSafeChapters(full);
      if (!chs.length) return toast('No chapters downloaded yet to send.', 'warning');
      setInputText(chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n'));
      setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
      setAssembledText('');
      setTranslatedChapters([]);
      setActiveNovelRecord?.(full || targetObj);
      setCurrentDocCover(full?.cover || targetObj?.cover || '');
      setFileName(full?.title || targetObj?.title || 'Web Novel');
      setCurrentDocTitle(full?.title || targetObj?.title || 'Web Novel');
      checkAndApplyNovelGlossary?.(full || targetObj);
      setActiveTab('text');
      toast(`Loaded ${chs.length} chapters into Translator.`, 'info');
    };

    const handleAutoScoutSite = async () => {
      const targetUrl = (webImportUrl || '').trim();
      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return toast?.('Paste a full https:// link first.', 'warning');
      const RE = typeof window !== 'undefined' ? window.SiteRecipeEngine : null;
      if (!RE?.Controller?.scoutWebsite) return toast?.('Site Scout engine not loaded.', 'error');
      setIsScoutingUrl(true);
      setScoutStatusText('Starting Scout...');
      try {
        const res = await RE.Controller.scoutWebsite(targetUrl, {
          onProgress: (stage, msg) => { setScoutStatusText(msg); }
        });
        if (res?.recipe) {
          if (res.stats?.chaptersCount >= 2) {
            toast?.(`Site scouted (${res.stats.chaptersCount} chapters). Fetching now...`, 'success');
            setTimeout(() => handleStartFetch(false), 500);
          } else {
            toast?.(`Recipe saved, detected ${res.stats?.chaptersCount || 0} chapter(s). Check Site Settings if needed.`, 'warning');
          }
        }
      } catch (err) {
        toast?.(`Scout: ${err.message}`, 'error');
      } finally {
        setIsScoutingUrl(false);
        setScoutStatusText('');
      }
    };

    const handleSearchTrigger = () => {
      const q = (webImportUrl || '').trim();
      if (!q) return;
      if (/^https?:\/\//i.test(q)) handleStartFetch(false);
      else if (importCategoryTab === 'books' || isBookSearchMode) handleSearchBooks(q);
      else if (importCategoryTab === 'audio' || isSwiftAudioMode) handleSwiftAudioSearch(q);
      else if (importCategoryTab === 'ln') handleSearchNovels(q, 'Lnori');
      else handleSearchNovels(q, novelSearchFilter || 'all');
    };

    const isLofterUrl = /lofter\.com|127\.net/i.test(webImportUrl || '');
    const isLnoriUrl = /lnori\.(?:org|com)\/(?:series|book)\//i.test(webImportUrl);
    const isWitchCultUrl = /witchculttranslation\.com|rezero/i.test(webImportUrl);
    const isSwiftAudioDetected = isSwiftAudioMode || /swiftaudiobooks\.com|ipaudio7\.com/i.test(webImportUrl);
    const isSpecificSwiftAudioBook = /^https?:\/\/(?:www\.)?(?:swiftaudiobooks\.com|ipaudio7\.com)\/[a-z0-9-]+/i.test((webImportUrl || '').trim()) &&
      !/https?:\/\/(?:www\.)?swiftaudiobooks\.com\/?$/i.test((webImportUrl || '').trim()) &&
      !(webImportUrl || '').includes('/?s=');
    const isLnoriNovel = Boolean(
      (activeNovelView?.sourceUrl && /lnori\.(?:org|com)/i.test(activeNovelView.sourceUrl)) ||
      (activeNovelView?.url && /lnori\.(?:org|com)/i.test(activeNovelView.url)) ||
      (activeNovelView?.tags && activeNovelView.tags.some(t => /lnori/i.test(t))) ||
      isLnoriUrl
    );
    const hasActiveRecipe = Boolean(webImportUrl && typeof window !== 'undefined' && window.SiteRecipeEngine?.findForUrl(webImportUrl));
    const hasResettableState = Boolean(activeNovelView || webImportUrl.trim() || novelSearchResults?.length || bookSearchResults?.length || swiftAudioResults?.length);
    const isIdleState = !webImportUrl.trim() && !isFetchingUrl && !isFetchingPaused && !activeNovelView && (!novelSearchResults || !novelSearchResults.length) && (!bookSearchResults || !bookSearchResults.length) && (!swiftAudioResults || !swiftAudioResults.length);

    function renderNovelPosterCard(item, idx, extraClass) {
      const isLnori = item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url || '');
      const onTap = () => {
        setWebImportUrl(item.url);
        if (isLnori) handleLnoriDirectEpubDownload(item.url);
        else {
          setIsSearchResultsCollapsed(true);
          handleStartFetch(false, null, false, item.url);
        }
      };
      return h('div', { key: item.id || idx, className: extraClass || 'omni-poster-card', onClick: onTap },
        h('div', { className: 'omni-poster-frame' },
          item.cover ? h('img', {
            src: item.cover,
            alt: item.title,
            loading: 'lazy',
            referrerPolicy: 'no-referrer',
            onError: (e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }
          }) : null,
          h('div', {
            style: {
              display: item.cover ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              background: '#0D0D10',
              color: 'rgba(255,255,255,0.35)'
            }
          }, ic('BookOpen', 26)),
          item.source && h('div', { className: 'omni-poster-prog-tag' }, item.source)
        ),
        h('div', { className: 'omni-poster-title', title: item.title }, item.title),
        h('div', { className: 'omni-poster-meta' }, item.author ? item.author : (item.chapters || ''))
      );
    }

    function renderDiscoverIdleDirectory() {
      if (omniPrefs.discoverLayout === 'rails') {
        const dirRow = (iconName, title, sub, onTap) => h('div', { className: 'omni-hairline-row', onClick: onTap },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h('span', { style: { color: 'var(--omni-accent)', display: 'inline-flex' } }, ic(iconName, 17)),
            h('div', null,
              h('div', { style: { fontSize: 13.5, fontWeight: 650, color: '#F5F5F5' } }, title),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)', marginTop: 2 } }, sub)
            )
          ),
          ic('ChevronRight', 15)
        );
        return h('div', { style: { marginTop: 6 } },
          h('div', { className: 'omni-section-label', style: { marginBottom: 4 } }, 'Sources Directory'),
          dirRow('Globe', 'Web Serials & Fan Archives', 'NovelBuddy, RoyalRoad, NovelFire, Wattpad, AO3, Syosetu', () => {
            setImportCategoryTab('wn'); setIsBookSearchMode(false); setIsSwiftAudioMode(false); setNovelSearchFilter('all');
            document.getElementById('discover-search-input')?.focus();
          }),
          dirRow('BookOpen', 'Light Novels (Lnori Catalog)', 'Illustrated official English light novels with 1-click EPUB', () => {
            setImportCategoryTab('ln'); setIsBookSearchMode(false); setIsSwiftAudioMode(false); setNovelSearchFilter('Lnori');
            document.getElementById('discover-search-input')?.focus();
          }),
          dirRow('Library', 'Public Domain & Published Books', 'Project Gutenberg, Standard Ebooks, Open Library, LibGen', () => {
            setImportCategoryTab('books'); setIsBookSearchMode(true); setIsSwiftAudioMode(false);
            document.getElementById('discover-search-input')?.focus();
          }),
          dirRow('Headphones', 'Spoken Audiobooks', 'SwiftAudiobooks stream player & offline MP3 chapter saver', () => {
            setImportCategoryTab('audio'); setIsBookSearchMode(false); setIsSwiftAudioMode(true);
            document.getElementById('discover-search-input')?.focus();
          }),
          dirRow('Sliders', 'Source Plugins & Community Catalog', 'Install or update community source extensions', handleOpenSourcePluginsModal),
          dirRow('Settings', 'Custom Site Recipes', 'Edit HTML selectors & cleanup rules for custom websites', () => openSiteRecipeEditor?.({ url: '' }))
        );
      }
      return h('div', { style: { textAlign: 'center', padding: '56px 16px' } },
        h('div', { style: { color: 'rgba(255,255,255,0.28)', display: 'flex', justifyContent: 'center', marginBottom: 14 } }, ic('Compass', 34)),
        h('div', { style: { fontSize: 17, fontWeight: 750, color: '#F5F5F5' } }, 'Discover & Import Books'),
        h('p', { style: { fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.5)', maxWidth: 360, margin: '8px auto 0' } },
          'Search web serials, light novels, classics, or audiobooks above, or paste any direct book link to import into your Library.'
        )
      );
    }

    return h(React.Fragment, null,
      // 1. Editorial 25px Discover Header + Circular Icon Triggers
      h('div', { className: 'omni-page-hd' },
        h('h1', { className: 'omni-page-title' }, 'Discover'),
        h('div', { className: 'omni-header-actions' },
          h('button', { type: 'button', className: 'omni-circle-btn', title: 'Source Plugins', onClick: handleOpenSourcePluginsModal }, ic('Sliders', 16)),
          h('button', {
            type: 'button',
            className: `omni-circle-btn ${hasActiveRecipe ? 'active' : ''}`,
            title: 'Site Recipes & Extraction Settings',
            onClick: () => openSiteRecipeEditor?.({ url: (webImportUrl || '').trim() })
          }, ic('Settings', 16)),
          h('button', { type: 'button', className: 'omni-circle-btn', title: 'Supported Sources', onClick: () => setSourcesModalOpen(true) }, ic('Info', 16)),
          hasResettableState && h('button', {
            type: 'button',
            className: 'omni-circle-btn',
            style: { color: '#F87171' },
            title: 'Reset Discover tab',
            onClick: () => { setImportCategoryTab('wn'); handleResetImportTab(); }
          }, ic('RotateCcw', 15))
        )
      ),

      // 2. Unified Smart 44px Search / URL Bar
      h('div', { className: 'omni-search-bar' },
        ic('Search', 15),
        h('input', {
          id: 'discover-search-input',
          type: 'text',
          placeholder: (importCategoryTab === 'books' || isBookSearchMode)
            ? 'Search classics, titles, or authors...'
            : (importCategoryTab === 'audio' || isSwiftAudioDetected)
              ? 'Search audiobooks or paste audio link...'
              : (importCategoryTab === 'ln')
                ? 'Search light novels or paste link...'
                : 'Search novels or paste direct URL...',
          value: webImportUrl,
          onChange: (e) => {
            setWebImportUrl(e.target.value);
            if (!e.target.value.trim() && importCategoryTab !== 'audio') setIsSwiftAudioMode(false);
          },
          onKeyDown: (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSearchTrigger(); }
          }
        }),
        isLofterUrl && h('button', {
          type: 'button',
          className: 'omni-soft-tab active',
          style: { padding: '4px 8px', fontSize: 11 },
          onClick: () => setShowLofterModal(true)
        }, lofterAuth?.cookieString ? 'Connected' : 'Lofter'),
        webImportUrl && h('button', {
          type: 'button',
          className: 'omni-circle-btn',
          style: { width: 26, height: 26 },
          onClick: () => { setWebImportUrl(''); if (importCategoryTab !== 'audio') setIsSwiftAudioMode(false); }
        }, ic('X', 12))
      ),

      // 3. Soft Borderless Category Tabs + Secondary Inline Tools
      h('div', { className: 'omni-soft-tabs' },
        [
          { id: 'wn', label: 'Web Novels', onTap: () => { setImportCategoryTab('wn'); setIsBookSearchMode(false); setIsSwiftAudioMode(false); setNovelSearchFilter('all'); } },
          { id: 'ln', label: 'Light Novels', onTap: () => { setImportCategoryTab('ln'); setIsBookSearchMode(false); setIsSwiftAudioMode(false); setNovelSearchFilter('Lnori'); } },
          { id: 'books', label: 'Books', onTap: () => { setImportCategoryTab('books'); setIsBookSearchMode(true); setIsSwiftAudioMode(false); } },
          { id: 'audio', label: 'Audio', onTap: () => { setImportCategoryTab('audio'); setIsBookSearchMode(false); setIsSwiftAudioMode(true); } }
        ].map(t => h('button', {
          key: t.id,
          type: 'button',
          className: `omni-soft-tab ${importCategoryTab === t.id ? 'active' : ''}`,
          onClick: t.onTap
        }, t.label)),
        h('span', { style: { width: 1, height: 14, background: 'var(--omni-hairline)', flexShrink: 0 } }),
        h('button', { type: 'button', className: 'omni-soft-tab', onClick: () => ongoingEpubInputRef?.current?.click() }, 'Continue EPUB'),
        h('button', { type: 'button', className: 'omni-soft-tab', onClick: toggleCrawlerSpeedMode }, crawlerSpeedMode === 'builtin' ? 'Speed: Fast' : 'Speed: Safe'),
        h('button', { type: 'button', className: 'omni-soft-tab', onClick: () => setShowLofterModal(true) }, lofterAuth?.cookieString ? 'Lofter: On' : 'Lofter')
      ),

      // Primary Search / Fetch Action Row when URL or query typed (and not currently fetching)
      webImportUrl.trim() && !isFetchingUrl && !isFetchingPaused && !isSpecificSwiftAudioBook && h('div', { className: 'omni-cta-row', style: { marginTop: 2, marginBottom: 12 } },
        (importCategoryTab === 'books' || isBookSearchMode)
          ? h('button', { type: 'button', className: 'omni-flat-cta', disabled: isSearchingBooks, onClick: () => handleSearchBooks(webImportUrl) }, ic('Search', 14), isSearchingBooks ? 'Searching Book Catalogs...' : 'Search Books')
          : (importCategoryTab === 'audio' || isSwiftAudioDetected)
            ? h('button', { type: 'button', className: 'omni-flat-cta', disabled: isSwiftAudioSearching, onClick: () => handleSwiftAudioSearch(webImportUrl) }, ic('Search', 14), isSwiftAudioSearching ? 'Searching Audiobooks...' : 'Search Audiobooks')
            : isLnoriUrl
              ? h(React.Fragment, null,
                  h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => handleLnoriDirectEpubDownload(webImportUrl) }, ic('Zap', 14), '1-Click Clean EPUB'),
                  h('button', { type: 'button', className: 'omni-flat-icon-btn', style: { width: 'auto', padding: '0 14px', fontSize: 12.5, fontWeight: 600 }, onClick: () => handleStartFetch(false) }, 'Chapters')
                )
              : (/^https?:\/\//i.test(webImportUrl.trim()))
                ? h(React.Fragment, null,
                    h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => handleStartFetch(false) }, ic('Download', 14), 'Fetch Novel URL'),
                    h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Auto-Scout & Learn Site', disabled: isScoutingUrl, onClick: handleAutoScoutSite }, ic(isScoutingUrl ? 'Loader2' : 'Sparkles', 16, isScoutingUrl ? 'animate-spin' : '')),
                    h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Search Title Instead', disabled: isSearchingNovels, onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all')) }, ic('Search', 16))
                  )
                : h('button', { type: 'button', className: 'omni-flat-cta', disabled: isSearchingNovels, onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all')) }, ic('Search', 14), isSearchingNovels ? 'Searching Sources...' : (importCategoryTab === 'ln' ? 'Search Light Novels' : 'Search Web Novels'))
      ),

      // 4. Contextual Notices & Live Status Strips (Zero Enclosing Cards)
      isScoutingUrl && scoutStatusText && h('div', { className: 'omni-hairline-row' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--omni-accent)' } },
          ic('Loader2', 15, 'animate-spin'),
          h('span', { style: { fontSize: 13, fontWeight: 600 } }, scoutStatusText)
        )
      ),

      webImportError && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: webImportError.isCloudflare ? '#F87171' : '#FBBF24' } },
            webImportError.isCloudflare ? 'Security Challenge Detected' : 'Crawl Paused to Protect Data'
          ),
          h('button', { type: 'button', className: 'omni-circle-btn', style: { width: 26, height: 26 }, onClick: () => setWebImportError(null) }, ic('X', 12))
        ),
        h('p', { style: { fontSize: 12, color: 'rgba(255,255,255,0.62)', margin: '0 0 8px' } }, webImportError.message || 'Connection interrupted.'),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 }, onClick: () => { setWebImportError(null); handleStartFetch(true); } }, 'Resume Fetch'),
          webImportError.targetUrl && h('button', {
            type: 'button',
            className: 'omni-soft-tab active',
            onClick: async () => {
              const targetUrl = webImportError.targetUrl;
              const solver = window.NativeBridge?.openInAppBrowser || window.NativeBridge?.resolveCloudflare;
              if (solver) {
                try {
                  const res = await solver(targetUrl);
                  if (res?.success || res?.status === 'ok') { setWebImportError(null); handleStartFetch(true); }
                } catch (_) {}
              } else window.open(targetUrl, '_blank');
            }
          }, webImportError.isCloudflare ? 'Open Browser Check' : 'Open Link'),
          (webImportError.targetUrl || webImportUrl) && h('button', { type: 'button', className: 'omni-soft-tab', onClick: handleAutoScoutSite }, 'Auto-Scout'),
          (webImportError.targetUrl || webImportUrl) && h('button', { type: 'button', className: 'omni-soft-tab', onClick: () => openSiteRecipeEditor?.({ url: webImportError.targetUrl || webImportUrl }) }, 'Site Settings')
        )
      ),

      isWitchCultUrl && !isFetchingUrl && (() => {
        const existingRezero = (webImportHistory || []).find(n => /witchcult|rezero/i.test(n?.sourceUrl || n?.url || n?.title || ''))
          || (activeCrawlSession && /witchcult|rezero/i.test(activeCrawlSession?.sourceUrl || activeCrawlSession?.url || activeCrawlSession?.title || '') ? activeCrawlSession : null);
        const existingChCount = existingRezero?.chapters?.length || existingRezero?.rawChapters?.length || 0;
        return h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 200 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#F5F5F5' } }, 'Curated Web Novel Archive'),
            h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } }, existingChCount > 0 ? `${existingChCount} chapters in Library` : 'Complete canonical archive ingestion')
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 12px', fontSize: 12 }, onClick: () => handleStartFetch(false, null, false, 'https://witchculttranslation.com/table-of-content/') }, 'Ingest Archive'),
            h('button', { type: 'button', className: 'omni-soft-tab active', onClick: handleCheckRezeroUpdates }, 'Updates')
          )
        );
      })(),

      isSpecificSwiftAudioBook && !isFetchingUrl && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
        h('div', null,
          h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#F5F5F5' } }, 'Audiobook Stream Ready'),
          h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)' } }, 'Stream tracks in-app or download MP3s offline')
        ),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 }, disabled: isSwiftAudioSearching, onClick: () => handleStartPlayAudiobook({ url: webImportUrl }) }, 'Listen Now'),
          h('button', { type: 'button', className: 'omni-soft-tab active', disabled: isSwiftAudioSearching, onClick: () => handleOpenAudioDownload({ url: webImportUrl }) }, 'Download MP3s')
        )
      ),

      epubPackagingModal && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: '#F5F5F5', marginBottom: 6 } },
          h('span', null, `Packaging ${epubPackagingModal.title || 'Novel'}`),
          h('span', { style: { color: 'var(--omni-accent)' } }, `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`)
        ),
        h('div', { className: 'omni-hero-prog-track' },
          h('div', { className: 'omni-hero-prog-fill', style: { width: `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%` } })
        ),
        h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 } }, epubPackagingModal.status || 'Compiling EPUB...')
      ),

      isFetchingUrl && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
          h('span', { style: { fontSize: 13, fontWeight: 650, color: 'var(--omni-accent)' } }, webImportStatus || 'Extracting chapters...'),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { type: 'button', className: 'omni-soft-tab active', onClick: handlePauseFetch }, 'Pause'),
            getSafeChapterCount(activeNovelView) > 0 && h('button', { type: 'button', className: 'omni-soft-tab', onClick: () => exportNovelAsEpub(activeNovelView) }, 'EPUB'),
            h('button', { type: 'button', className: 'omni-soft-tab', style: { color: '#F87171' }, onClick: handleCancelFetch }, 'Cancel')
          )
        ),
        h('div', { className: 'mini-progress' }, h('i'))
      ),

      isFetchingPaused && !isFetchingUrl && h('div', { style: { padding: '12px 0', borderBottom: '0.6px solid var(--omni-hairline)' } },
        h('div', { style: { fontSize: 12.5, fontWeight: 650, color: '#FBBF24', marginBottom: 8 } }, `Paused · ${getSafeChapterCount(activeNovelView)} chapters cached`),
        h('div', { className: 'omni-cta-row', style: { margin: 0 } },
          h('button', { type: 'button', className: 'omni-flat-cta', style: { height: 38, fontSize: 12.5 }, onClick: () => handleStartFetch(true) }, ic('Play', 13), 'Resume Fetch'),
          h('button', { type: 'button', className: 'omni-flat-icon-btn', style: { width: 'auto', padding: '0 12px', height: 38, fontSize: 12, fontWeight: 600 }, onClick: () => openNovelInReader(activeNovelView) }, 'Read'),
          h('button', { type: 'button', className: 'omni-flat-icon-btn', style: { width: 'auto', padding: '0 12px', height: 38, fontSize: 12, fontWeight: 600 }, onClick: () => exportNovelAsEpub(activeNovelView) }, 'EPUB'),
          h('button', { type: 'button', className: 'omni-flat-icon-btn', style: { height: 38, width: 38, color: '#F87171' }, onClick: handleCancelFetch }, ic('X', 14))
        )
      ),

      // Quick Resume Draft Hairline Row (when idle or returning with incomplete draft)
      activeCrawlSession && !isFetchingPaused && !isFetchingUrl && !activeNovelView && h('div', { className: 'omni-hairline-row', style: { flexWrap: 'wrap' } },
        h('div', { style: { flex: 1, minWidth: 180 } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Draft In Progress'),
          h('div', { style: { fontSize: 14, fontWeight: 700, color: '#F5F5F5', marginTop: 2 } }, activeCrawlSession.title || 'Untitled Web Novel'),
          h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, `${getSafeChapterCount(activeCrawlSession)} / ${activeCrawlSession.totalChapterCount || '?'} chapters`)
        ),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'omni-flat-cta', style: { flex: 'none', height: 34, padding: '0 14px', fontSize: 12 }, onClick: () => handleStartFetch(true) }, 'Resume'),
          h('button', { type: 'button', className: 'omni-soft-tab active', onClick: () => openNovelInReader(activeCrawlSession) }, 'Read'),
          h('button', { type: 'button', className: 'omni-soft-tab', onClick: () => exportNovelAsEpub(activeCrawlSession) }, 'EPUB'),
          h('button', { type: 'button', className: 'omni-circle-btn', style: { width: 30, height: 30, color: '#F87171' }, onClick: dismissCrawlSession }, ic('X', 13))
        )
      ),

      // 5. Active Fetched Novel / Playlist / UserLists View
      activeNovelView && (activeNovelView.isPlaylist ? (
        h('div', null,
          h('div', { className: 'omni-novel-compact-hero' },
            activeNovelView.cover && h('img', { src: activeNovelView.cover, alt: '', className: 'omni-spotlight-bg' }),
            h('div', { className: 'omni-poster-frame', style: { width: 76, height: 114, position: 'relative', zIndex: 2 } },
              activeNovelView.cover ? h('img', { src: activeNovelView.cover, alt: 'Cover' }) : ic('List', 28)
            ),
            h('div', { style: { flex: 1, minWidth: 0, position: 'relative', zIndex: 2 } },
              h('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--omni-accent)' } }, 'Reading List'),
              h('div', { style: { fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginTop: 2 } }, activeNovelView.title || 'Reading List'),
              h('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 } }, `${activeNovelView.stories?.length || activeNovelView.totalCount || 0} stories`)
            )
          ),
          h('div', { className: 'omni-cta-row' },
            h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => handleMassDownloadPlaylist ? handleMassDownloadPlaylist(activeNovelView) : toast('Mass download handler unavailable.', 'error') },
              ic('Download', 14), `Mass Download EPUBs (${activeNovelView.stories?.length || activeNovelView.totalCount || 0})`
            ),
            h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Set Folder', onClick: () => handleSetNovelFolder(activeNovelView) }, ic('Folder', 16))
          ),
          (activeNovelView.stories || []).map((story, sIdx) => h('div', { key: story.url || sIdx, className: 'omni-hairline-row' },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }, onClick: () => { setWebImportUrl(story.url); handleStartFetch(false, null, false, story.url); } },
              h('div', { className: 'omni-poster-frame', style: { width: 40, height: 60 } }, story.cover ? h('img', { src: story.cover, alt: '' }) : ic('BookOpen', 16)),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13.5, fontWeight: 650, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, story.title),
                h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, `${story.author ? story.author + ' · ' : ''}${story.chapters || story.chapterCount || 0} Ch`)
              )
            ),
            h('button', {
              type: 'button',
              className: 'omni-soft-tab active',
              onClick: () => handleMassDownloadPlaylist ? handleMassDownloadPlaylist({ title: story.title, stories: [story] }) : (setWebImportUrl(story.url), handleStartFetch(false, null, false, story.url))
            }, 'EPUB')
          ))
        )
      ) : activeNovelView.isUserLists ? (
        h('div', null,
          h('div', { className: 'omni-section-label-row' },
            h('span', { className: 'omni-section-label' }, `${activeNovelView.username || 'User'}'s Reading Lists (${activeNovelView.lists?.length || 0})`)
          ),
          (activeNovelView.lists || []).map((list, lIdx) => h('div', { key: list.id || lIdx, className: 'omni-hairline-row' },
            h('div', { style: { flex: 1, minWidth: 0 }, onClick: () => { setWebImportUrl(list.url); handleStartFetch(false, null, false, list.url); } },
              h('div', { style: { fontSize: 14, fontWeight: 650, color: '#F5F5F5' } }, list.name),
              h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.48)' } }, `${list.numStories || 0} stories`)
            ),
            h('button', {
              type: 'button',
              className: 'omni-soft-tab active',
              onClick: async () => {
                const pl = await window.sourceRegistry?.getPlugin?.('wattpad')?.getPlaylistDetails?.(list.url);
                if (pl?.stories?.length && handleMassDownloadPlaylist) handleMassDownloadPlaylist(pl);
                else { setWebImportUrl(list.url); handleStartFetch(false, null, false, list.url); }
              }
            }, 'Mass EPUB')
          ))
        )
      ) : (() => {
        const chs = getSafeChapters(activeNovelView);
        const totalWords = chs.reduce((a, c) => a + (((c && (c.text || c.content)) || '').split(/\s+/).filter(Boolean).length), 0);
        const fOpts = getNovelFolderOptions(activeNovelView);
        const dispPath = activeNovelView.folderPath || fOpts.folderPath || '';
        const hasFolder = !!(dispPath || activeNovelView.folderTreeUri || fOpts.treeUri);
        const novelTitleDisplay = activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || 'Untitled Web Novel';

        return h(React.Fragment, null,
          h('div', { className: 'omni-novel-compact-hero' },
            activeNovelView.cover && h('img', { src: activeNovelView.cover, alt: '', className: 'omni-spotlight-bg' }),
            h('div', { className: 'omni-poster-frame', style: { width: 78, height: 117, position: 'relative', zIndex: 2 } },
              activeNovelView.cover ? h('img', { src: activeNovelView.cover, alt: 'Cover' }) : ic('BookOpen', 28)
            ),
            h('div', { style: { flex: 1, minWidth: 0, position: 'relative', zIndex: 2 } },
              h('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--omni-accent)' } },
                isLnoriNovel ? 'English Light Novel' : 'Web Novel'
              ),
              h('div', { style: { fontSize: 18, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginTop: 2 } }, novelTitleDisplay),
              h('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.68)', marginTop: 3 } }, `By ${activeNovelView.author || 'Unknown'}`),
              h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
                h('button', {
                  type: 'button',
                  className: 'omni-soft-tab active',
                  style: { padding: '4px 10px', fontSize: 11 },
                  onClick: () => {
                    setRenameModalNovel(activeNovelView);
                    setNewNovelTitleInput(novelTitleDisplay);
                  }
                }, 'Rename'),
                h('button', {
                  type: 'button',
                  className: 'omni-soft-tab',
                  style: { padding: '4px 10px', fontSize: 11, background: 'rgba(255,255,255,0.08)' },
                  onClick: () => { setImportCategoryTab('wn'); handleResetImportTab(); }
                }, 'New Import')
              )
            )
          ),

          // Unboxed 4-Col Crawl Telemetry Strip
          h('div', { className: 'omni-hairline-strip' },
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, `${getSafeChapterCount(activeNovelView)}`),
              h('div', { className: 'omni-stat-lbl' }, 'Fetched')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : `${totalWords}`),
              h('div', { className: 'omni-stat-lbl' }, 'Words')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, activeNovelView.isIncomplete ? 'Partial' : 'Complete'),
              h('div', { className: 'omni-stat-lbl' }, 'Status')
            ),
            h('div', { className: 'omni-stat-cell' },
              h('div', { className: 'omni-stat-val' }, activeNovelView.source || (isLnoriNovel ? 'Lnori' : 'Web')),
              h('div', { className: 'omni-stat-lbl' }, 'Source')
            )
          ),

          // Flat CTA Bar for Active Novel
          h('div', { className: 'omni-cta-row' },
            isLnoriNovel
              ? h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => exportCleanLnoriEpub(activeNovelView) }, ic('Zap', 14), `Clean EPUB (${getSafeChapterCount(activeNovelView)})`)
              : h('button', { type: 'button', className: 'omni-flat-cta', onClick: () => openNovelInReader(activeNovelView) }, ic('BookOpen', 14), `Read (${getSafeChapterCount(activeNovelView)} Ch)`),
            !isLnoriNovel && h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Download EPUB', onClick: () => exportNovelAsEpub(activeNovelView) }, ic('Download', 17)),
            isLnoriNovel && h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Read in Reader', onClick: () => openNovelInReader(activeNovelView) }, ic('BookOpen', 17)),
            h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Send to Translator', onClick: () => sendNovelToTranslator(activeNovelView) }, ic('Languages', 17)),
            h('button', { type: 'button', className: 'omni-flat-icon-btn', title: 'Auto-Build Glossary', onClick: () => handleOpenAutoGlossary(activeNovelView) }, ic('Sparkles', 17)),
            h('button', {
              type: 'button',
              className: `omni-flat-icon-btn ${activeNovelView.inSavedSpace ? 'active' : ''}`,
              title: activeNovelView.inSavedSpace ? 'In Saved Space' : 'Save to Space',
              onClick: () => toggleNovelSavedSpace(activeNovelView.id, activeNovelView)
            }, ic('Star', 17)),
            h('button', {
              type: 'button',
              className: `omni-flat-icon-btn ${hasFolder ? 'active' : ''}`,
              title: dispPath || 'Set Designated Folder',
              onClick: () => handleSetNovelFolder(activeNovelView)
            }, ic('Folder', 17))
          ),

          // Chapter List with Volume Hierarchy & Reorder Tools (Hairline Rows)
          chs.length > 0 && (() => {
            const sortedChs = [...chs].sort((a, b) => (a && b && a.idx !== undefined && b.idx !== undefined) ? (a.idx - b.idx) : 0);
            const volRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc)\s*(\d+|[IVXLCDM]+)[\s:–—,-]*(.*)$/i;
            const volumeGroups = [];
            const groupMap = new Map();

            sortedChs.forEach((ch, globalIdx) => {
              const title = ch?.title || '';
              const explicitVol = ch?.volume || ch?.arc;
              let volName = null;
              let cleanTitle = title;
              if (explicitVol) {
                const arcM = String(explicitVol).match(/^(Arc\s*\d+|Arc\s*[IVXLCDM]+|Volume\s*\d+|Book\s*\d+|Side\s*Content|EX\s*Novel|IF\s*Stories)/i);
                volName = arcM ? arcM[1].replace(/\b\w/g, l => l.toUpperCase()) : String(explicitVol).trim();
                const tMatch = title.match(volRegex);
                if (tMatch && tMatch[3]) cleanTitle = tMatch[3].trim();
              } else {
                const match = title.match(volRegex);
                if (match) {
                  const prefix = match[1].toLowerCase().startsWith('vol') ? 'Volume' : (match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase());
                  const num = parseInt(match[2], 10) || match[2];
                  volName = `${prefix} ${num}`;
                  cleanTitle = match[3] ? match[3].trim() : title;
                }
              }
              cleanTitle = (cleanTitle || title).replace(/^[\s:–—,.-]+/, '').trim() || title;
              const effectiveVolName = volName || (groupMap.size === 0 ? 'Prologue / General' : 'Extra / Other');
              const volKey = volName ? `vol_${volName.replace(/\s+/g, '_')}` : `group_${effectiveVolName.replace(/\s+/g, '_')}`;
              let targetGroup = groupMap.get(volKey);
              if (!targetGroup) {
                targetGroup = { volKey, volName: effectiveVolName, hasRealVolume: Boolean(volName), items: [] };
                groupMap.set(volKey, targetGroup);
                volumeGroups.push(targetGroup);
              }
              targetGroup.items.push({ chapter: ch, globalIdx, cleanTitle: cleanTitle || title });
            });

            const distinctNamedVolumes = volumeGroups.filter(g => g.hasRealVolume);
            const isMultiVolume = (distinctNamedVolumes.length >= 2 || (volumeGroups.length >= 2 && distinctNamedVolumes.length >= 1)) && !isFlatChapterView;
            const isVolCollapsed = (volKey, idx) => (collapsedVolumes[volKey] !== undefined ? collapsedVolumes[volKey] : idx > 0);
            const areAllCollapsed = volumeGroups.every((g, idx) => isVolCollapsed(g.volKey, idx));

            const renderChapterRow = (c, i, displayTitle) => h('div', { key: i, className: 'omni-hairline-row', style: { cursor: 'default' } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13.5, fontWeight: 550, color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
                  `${i + 1}. ${displayTitle}`
                ),
                h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.44)', marginTop: 2 } },
                  `${((c?.text || c?.content || '').split(/\s+/).filter(Boolean).length).toLocaleString()} words`
                )
              ),
              h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
                h('button', { type: 'button', className: 'ch-btn', disabled: i === 0, onClick: () => moveImportChapterToEdge(i, 'top') }, ic('ChevronsUp', 12)),
                h('button', { type: 'button', className: 'ch-btn', disabled: i === 0, onClick: () => moveImportChapter(i, -1) }, ic('ChevronUp', 12)),
                h('button', { type: 'button', className: 'ch-btn', disabled: i >= sortedChs.length - 1, onClick: () => moveImportChapter(i, 1) }, ic('ChevronDown', 12)),
                h('button', { type: 'button', className: 'ch-btn', disabled: i >= sortedChs.length - 1, onClick: () => moveImportChapterToEdge(i, 'bottom') }, ic('ChevronsDown', 12)),
                h('button', { type: 'button', className: 'ch-btn danger', onClick: () => removeImportChapter(i) }, ic('X', 12))
              )
            );

            return h('div', { style: { marginTop: 6 } },
              h('div', { className: 'omni-section-label-row', style: { flexWrap: 'wrap', gap: 6 } },
                h('span', { className: 'omni-section-label' }, `Chapters (${sortedChs.length})`),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  (distinctNamedVolumes.length >= 2 || volumeGroups.length >= 2) && h('button', {
                    type: 'button',
                    className: 'omni-soft-tab',
                    style: { padding: '3px 8px', fontSize: 11 },
                    onClick: () => setIsFlatChapterView(prev => {
                      const next = !prev;
                      try { localStorage.setItem('gemini_flat_chapter_view', String(next)); } catch (_) {}
                      return next;
                    })
                  }, isFlatChapterView ? 'Group Arcs' : 'Flat List'),
                  isMultiVolume && h('button', {
                    type: 'button',
                    className: 'omni-soft-tab',
                    style: { padding: '3px 8px', fontSize: 11 },
                    onClick: () => {
                      const target = !areAllCollapsed;
                      const next = {};
                      volumeGroups.forEach(g => { next[g.volKey] = target; });
                      setCollapsedVolumes(next);
                    }
                  }, areAllCollapsed ? 'Expand All' : 'Collapse All'),
                  h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11 }, onClick: autoSortImportChapters }, 'Auto-Sort'),
                  h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11 }, disabled: isAiSorting, onClick: aiReorderImportChapters }, isAiSorting ? 'Sorting...' : 'AI Sort'),
                  h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11 }, onClick: reverseImportChapters }, 'Reverse')
                )
              ),
              h('div', { className: 'custom-scrollbar', style: { maxHeight: 420, overflowY: 'auto' } },
                isMultiVolume
                  ? volumeGroups.map((vol, vIdx) => {
                      const collapsed = isVolCollapsed(vol.volKey, vIdx);
                      return h('div', { key: vol.volKey || vIdx },
                        h('div', {
                          className: 'omni-hairline-row',
                          onClick: () => setCollapsedVolumes(prev => ({ ...prev, [vol.volKey]: !collapsed }))
                        },
                          h('span', { style: { fontSize: 13.5, fontWeight: 700, color: 'var(--omni-accent)' } }, `${collapsed ? '+' : '-'} ${vol.volName} (${vol.items.length})`),
                          ic(collapsed ? 'ChevronRight' : 'ChevronDown', 14)
                        ),
                        !collapsed && h('div', { style: { paddingLeft: 10, borderLeft: '0.6px solid var(--omni-hairline)' } },
                          vol.items.map(it => renderChapterRow(it.chapter, it.globalIdx, it.cleanTitle || it.chapter?.title || `Chapter ${it.globalIdx + 1}`))
                        )
                      );
                    })
                  : sortedChs.map((c, i) => renderChapterRow(c, i, c?.title || `Chapter ${i + 1}`))
              ),
              h('div', { className: 'omni-hairline-row', style: { cursor: 'default' } },
                h('span', { style: { fontSize: 13, fontWeight: 500, color: '#F5F5F5' } }, 'Scrape images with chapters'),
                h('button', {
                  type: 'button',
                  className: `switch ${scrapeImages ? 'on' : ''}`,
                  onClick: () => {
                    const next = !scrapeImages;
                    setScrapeImages(next);
                    localStorage.setItem('scrapeImages', String(next));
                    window.__scrapeImages = next;
                  }
                })
              ),
              h('div', { className: 'omni-hairline-row', style: { cursor: 'default' } },
                h('span', { style: { fontSize: 13, fontWeight: 500, color: '#F5F5F5' } }, 'Embed images in EPUB'),
                h('button', {
                  type: 'button',
                  className: `switch ${epubIncludeImages ? 'on' : ''}`,
                  onClick: () => {
                    const next = !epubIncludeImages;
                    setEpubIncludeImages(next);
                    localStorage.setItem('epubIncludeImages', String(next));
                    if (next && !scrapeImages) {
                      setScrapeImages(true);
                      localStorage.setItem('scrapeImages', 'true');
                      window.__scrapeImages = true;
                    }
                  }
                })
              )
            );
          })()
        );
      })()),

      // 6. Idle Screen (3-Col Grid Editorial Welcome vs Rails Sources Directory)
      isIdleState && renderDiscoverIdleDirectory(),

      // 7. Web Novel Search Results (Grid vs Spotlight + Horizontal Rails)
      novelSearchResults && novelSearchResults.length > 0 && (() => {
        const allSources = ['all', ...Array.from(new Set(novelSearchResults.map(n => n.source).filter(Boolean)))];
        const filteredNovels = novelSearchResults.filter(item => {
          const f = (novelSearchFilter || 'all').replace(/[\s\-_]+/g, '').toLowerCase();
          if (f === 'all') return true;
          return (item.source || '').replace(/[\s\-_]+/g, '').toLowerCase() === f;
        });

        const groupedBySource = {};
        filteredNovels.forEach(item => {
          const srcName = item.source || 'Results';
          if (!groupedBySource[srcName]) groupedBySource[srcName] = [];
          groupedBySource[srcName].push(item);
        });

        return h('div', { style: { marginTop: 12 } },
          h('div', { className: 'omni-section-label-row', style: { flexWrap: 'wrap', gap: 6 } },
            h('span', { className: 'omni-section-label' }, `Web Novel Results (${filteredNovels.length})`),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              activeNovelView && h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11 }, onClick: () => setIsSearchResultsCollapsed(!isSearchResultsCollapsed) },
                isSearchResultsCollapsed ? 'Show Results' : 'Hide'
              ),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11, color: '#F87171' }, onClick: () => setNovelSearchResults([]) }, 'Clear')
            )
          ),
          (!activeNovelView || !isSearchResultsCollapsed) && h(React.Fragment, null,
            allSources.length > 2 && h('div', { className: 'omni-soft-tabs', style: { paddingBottom: 10 } },
              allSources.map(f => {
                const normF = (f || '').replace(/[\s\-_]+/g, '').toLowerCase();
                const isSel = (novelSearchFilter || 'all').replace(/[\s\-_]+/g, '').toLowerCase() === normF;
                return h('button', { key: f, type: 'button', className: `omni-soft-tab ${isSel ? 'active' : ''}`, onClick: () => setNovelSearchFilter(f) }, f === 'all' ? 'All Sources' : f);
              })
            ),
            omniPrefs.discoverLayout === 'rails' && filteredNovels.length > 0
              ? h(React.Fragment, null,
                  (() => {
                    const top = filteredNovels[0];
                    const isTopLnori = top.source === 'Lnori' || /lnori\.(?:org|com)/i.test(top.url || '');
                    return h('div', {
                      className: 'omni-spotlight',
                      onClick: () => { setWebImportUrl(top.url); isTopLnori ? handleLnoriDirectEpubDownload(top.url) : (setIsSearchResultsCollapsed(true), handleStartFetch(false, null, false, top.url)); }
                    },
                      top.cover && h('img', { src: top.cover, alt: '', className: 'omni-spotlight-bg', referrerPolicy: 'no-referrer' }),
                      h('div', { className: 'omni-spotlight-scrim' }),
                      h('div', { className: 'omni-poster-frame', style: { width: 78, height: 117, position: 'relative', zIndex: 2 } },
                        top.cover ? h('img', { src: top.cover, alt: top.title, referrerPolicy: 'no-referrer' }) : ic('BookOpen', 24)
                      ),
                      h('div', { style: { flex: 1, minWidth: 0, position: 'relative', zIndex: 2 } },
                        h('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--omni-accent)' } }, `${top.source || 'Spotlight'} Match`),
                        h('div', { style: { fontSize: 17, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, marginTop: 3 } }, top.title),
                        h('div', { style: { fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginTop: 3 } }, top.author || top.chapters || ''),
                        h('button', { type: 'button', className: 'omni-hero-continue-btn', style: { marginTop: 8, height: 32, fontSize: 11.5 } },
                          isTopLnori ? '1-Click EPUB' : 'Fetch Novel'
                        )
                      )
                    );
                  })(),
                  Object.keys(groupedBySource).map(srcKey => h(React.Fragment, { key: srcKey },
                    h('div', { className: 'omni-section-label-row' },
                      h('span', { className: 'omni-section-label' }, `${srcKey} (${groupedBySource[srcKey].length})`)
                    ),
                    h('div', { className: 'omni-poster-rail' },
                      groupedBySource[srcKey].map((item, idx) => renderNovelPosterCard(item, idx, 'omni-rail-item'))
                    )
                  ))
                )
              : h('div', { className: 'omni-poster-grid' },
                  filteredNovels.map((item, idx) => renderNovelPosterCard(item, idx, 'omni-poster-card'))
                )
          )
        );
      })(),

      // 8. SwiftAudio Results Grid
      swiftAudioResults && swiftAudioResults.length > 0 && h('div', { style: { marginTop: 12 } },
        h('div', { className: 'omni-section-label-row' },
          h('span', { className: 'omni-section-label' }, `Audiobook Results (${swiftAudioResults.length})`),
          h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11, color: '#F87171' }, onClick: () => setSwiftAudioResults([]) }, 'Clear')
        ),
        h('div', { className: 'omni-poster-grid' },
          swiftAudioResults.map((item, idx) => h('div', { key: idx, className: 'omni-poster-card', onClick: () => handleStartPlayAudiobook(item) },
            h('div', { className: 'omni-poster-frame' },
              item.cover ? h('img', { src: item.cover, alt: item.title, referrerPolicy: 'no-referrer' }) : h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' } }, ic('Headphones', 28)),
              h('div', { className: 'omni-poster-prog-tag' }, item.duration || 'Audio')
            ),
            h('div', { className: 'omni-poster-title' }, item.title),
            h('div', { className: 'omni-poster-meta' }, item.author || 'SwiftAudio')
          ))
        )
      ),

      // 9. Published Book Search Results Grid
      bookSearchResults && bookSearchResults.length > 0 && (() => {
        const displayedBooks = (bookSearchResults || []).filter(item => !booksDownloadableOnly || Boolean(item.directEpub || item.epubUrl || item.downloadUrl));
        return h('div', { style: { marginTop: 12 } },
          h('div', { className: 'omni-section-label-row', style: { flexWrap: 'wrap', gap: 6 } },
            h('span', { className: 'omni-section-label' }, `Book Results (${displayedBooks.length})`),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
              h('button', { type: 'button', className: `omni-soft-tab ${booksDownloadableOnly ? 'active' : ''}`, style: { padding: '3px 8px', fontSize: 11 }, onClick: () => setBooksDownloadableOnly(v => !v) },
                booksDownloadableOnly ? 'Direct Files Only' : 'All Records'
              ),
              h('button', { type: 'button', className: 'omni-soft-tab', style: { padding: '3px 8px', fontSize: 11, color: '#F87171' }, onClick: () => setBookSearchResults([]) }, 'Clear')
            )
          ),
          displayedBooks.length === 0
            ? h('div', { style: { padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12.5 } },
                'No direct EPUB/PDF links under filter. ',
                h('button', { type: 'button', className: 'omni-soft-tab active', onClick: () => setBooksDownloadableOnly(false) }, 'Show All Records')
              )
            : h('div', { className: 'omni-poster-grid' },
                displayedBooks.map((item, idx) => {
                  const isEpub = item.format === 'EPUB' || (item.formatBadge && item.formatBadge.includes('EPUB'));
                  const onTapBook = () => {
                    if (isEpub || item.directEpub || item.epubUrl) handleDownloadBookEpub(item);
                    else if (item.downloadUrl) (window.BookSearchEngine?.openExternalUrl || window.open)(item.downloadUrl, '_blank');
                    else if (item.iaUrl || item.annasUrl || item.workUrl) window.open(item.iaUrl || item.annasUrl || item.workUrl, '_blank');
                  };
                  return h('div', { key: item.id || idx, className: 'omni-poster-card', onClick: onTapBook },
                    h('div', { className: 'omni-poster-frame' },
                      item.cover ? h('img', { src: item.cover, alt: item.title, referrerPolicy: 'no-referrer' }) : h('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)' } }, ic('Library', 26)),
                      h('div', { className: 'omni-poster-prog-tag' }, item.sourceBadge || (isEpub ? 'EPUB' : 'BOOK'))
                    ),
                    h('div', { className: 'omni-poster-title' }, item.title),
                    h('div', { className: 'omni-poster-meta' }, item.authors || item.source || '')
                  );
                })
              )
        );
      })(),

      sourcesModalOpen && h(SourcesInfoModal, { isOpen: sourcesModalOpen, onClose: () => setSourcesModalOpen(false) }),

      showLofterModal && h(window.LofterAuthModal || (typeof LofterAuthModal !== 'undefined' ? LofterAuthModal : null), {
        isOpen: showLofterModal,
        onClose: () => setShowLofterModal(false),
        auth: lofterAuth,
        onInAppLogin: handleLofterInAppLogin,
        onSaveManualCookie: handleSaveLofterCookie,
        onDisconnect: handleDisconnectLofter,
        isConnecting: isLofterConnecting
      })
    );
  }

  return { TabImporter };
}));
