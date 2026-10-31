/**
 * app_tab_importer.js - Web Novel Importer & Crawlers Component for Gemini Translator
 * Handles web novel URL ingestion, scraping, multi-source search (AO3, Syosetu, Witch Cult, Lnori, SwiftAudio),
 * live crawl session management, volume hierarchy grouping, chapter ordering, and EPUB compilation.
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
    const ic = (typeof window !== 'undefined' && window.ic) || function() { return null; };

    return h('div', {
      className: 'gloss-overlay',
      style: { zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        className: 'gloss-box',
        style: {
          maxWidth: 620,
          width: '94vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 14,
          background: 'var(--surface-modal, #11131a)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden'
        }
      },
        h('div', {
          className: 'gloss-head',
          style: {
            padding: '14px 18px',
            borderBottom: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ic('Info', 18),
            h('span', { style: { fontWeight: 700, fontSize: 15, color: 'var(--paper)' } }, 'Supported Built-in Sources & Formats')
          ),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            style: { cursor: 'pointer', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center' },
            onClick: onClose
          }, ic('X', 14))
        ),
        h('div', {
          style: {
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            lineHeight: 1.5,
            fontSize: 12.5
          }
        },
          h('div', {
            style: {
              background: 'rgba(99, 102, 241, 0.06)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 10,
              padding: '12px 14px'
            }
          },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: 'var(--iris)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
              ic('BookOpen', 15),
              'Light Novels (LNs)'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Direct access to official & translated Light Novel catalogs with formatted chapters and volume structures.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Lnori Catalog: '), 'Live catalog search with 1-click clean EPUB generation, volume separation, high-resolution covers, and full metadata.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Formats: '), 'Direct EPUB download, chapter-by-chapter scraping, or sending straight into translation.')
            )
          ),
          h('div', {
            style: {
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 10,
              padding: '12px 14px'
            }
          },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
              ic('Globe', 15),
              'Web Novels (WNs)'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Built-in parsers for leading serialization platforms, fan archives, and aggregators.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Built-in Crawlers: '), 'NovelBuddy, NovelFire, RoyalRoad, NovelBin, ReadNovelFull, ScribbleHub.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Special Curated Archives: '), 'Curated novel chapter archives with live table-of-contents auto-update checking.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Community & Fanfic: '), 'Archive of Our Own (AO3), Pixiv (series & novels), Syosetu (Shousetsuka ni Narou), Kakuyomu.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Extensible Source Plugins: '), 'Install and run community source plugins with custom domain routing.')
            )
          ),
          h('div', {
            style: {
              background: 'rgba(236, 72, 153, 0.06)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              borderRadius: 10,
              padding: '12px 14px'
            }
          },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#f472b6', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
              ic('Headphones', 15),
              'Audiobooks'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Free streaming and offline downloads for spoken audiobooks and multi-part narrations.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Supported Sources: '), 'SwiftAudiobooks, IPAudio (auto-resolves audio tracks and series metadata).'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'In-App Player: '), 'Full playback controls, speed slider (0.5x – 2.5x), sleep timer, and background audio keep-alive.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Batch Downloader: '), 'Save MP3 chapters offline to your device or Moon+ Reader audio folder.')
            )
          ),
          h('div', {
            style: {
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 10,
              padding: '12px 14px'
            }
          },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
              ic('Library', 15),
              'Books & Published Literature'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Multi-catalog search covering millions of public domain masterpieces, textbooks, and free digital editions.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Project Gutenberg: '), '70,000+ public domain literary classics with direct EPUB downloads.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Standard Ebooks: '), 'Carefully typeset, beautifully formatted public domain editions with rich typography.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Library Genesis: '), 'Direct mirrors for millions of fiction, non-fiction, and academic books.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Open Library & Internet Archive: '), 'Universal catalog records and borrowable digital texts.')
            )
          ),
          h('div', {
            style: {
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--hairline)',
              borderRadius: 10,
              padding: '12px 14px',
              color: 'var(--slate)'
            }
          },
            h('div', { style: { fontWeight: 600, color: 'var(--paper)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } }, ic('Sparkles', 13), 'Zero-Login & Direct Links:'),
            h('div', null, '• All built-in search and downloads work immediately out of the box with no account required.'),
            h('div', null, '• You can also paste any direct webpage or chapter URL into the search bar at any time to automatically extract and format its prose.')
          )
        ),
        h('div', {
          className: 'gloss-head',
          style: {
            padding: '12px 18px',
            borderTop: '1px solid var(--hairline)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)'
          }
        },
          h('button', {
            type: 'button',
            className: 'mini-btn primary',
            style: { padding: '7px 18px', fontWeight: 600, borderRadius: 8 },
            onClick: onClose
          }, 'Got it!')
        )
      )
    );
  }

  function TabImporter(props) {
    const ReactObj = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null);
    const useState = ReactObj?.useState || function(init) { return [init, function() {}]; };
    const useEffect = ReactObj?.useEffect || function() {};
    const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
    const toast = (typeof window !== 'undefined' && window.toast) || props?.toast || function() {};
    const ic = (typeof window !== 'undefined' && window.ic) || props?.ic || function() { return null; };
    const btn = (typeof window !== 'undefined' && window.btn) || props?.btn || function(p, ...ch) { return h('button', p, ...ch); };

    const {
      webImportUrl,
      setWebImportUrl,
      webImportStatus,
      setWebImportStatus,
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
      setIsSwiftAudioSearching,
      bookSearchResults,
      setBookSearchResults,
      isBookSearchMode,
      setIsBookSearchMode,
      isSearchingBooks,
      setIsSearchingBooks,
      bookSearchFilter,
      setBookSearchFilter,
      handleSearchBooks,
      handleDownloadBookEpub,
      handleSaveBookEpub,
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
      isAudiobookInLibrary,
      saveAudiobookToLibrary,
      removeAudiobookFromLibrary,
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
      getEpubFileName = (typeof window !== 'undefined' && window.getEpubFileName) || ((t, c) => `${t}.epub`),
      getEpubOptions = (typeof window !== 'undefined' && window.getEpubOptions) || (() => ({})),
      getNovelFolderOptions = (typeof window !== 'undefined' && window.getNovelFolderOptions) || (() => ({})),
      saveUniversalBlob = (typeof window !== 'undefined' && window.saveUniversalBlob),
      InfoTooltip = (props && props.InfoTooltip) || (({ title, text, tip }) => h('span', { title: tip || text }, 'ℹ️'))
    } = props || {};

    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
    const [lofterAuth, setLofterAuth] = useState(null);
    const [showLofterModal, setShowLofterModal] = useState(false);
    const [isLofterConnecting, setIsLofterConnecting] = useState(false);

    useEffect(() => {
      let active = true;
      const loadLofterAuth = async () => {
        try {
          if (window.GeminiNovelDB?.getSiteAuth) {
            const auth = await window.GeminiNovelDB.getSiteAuth('lofter');
            if (active) setLofterAuth(auth);
          }
        } catch (_) {}
      };
      loadLofterAuth();

      const handleShare = (e) => {
        const text = e.detail?.text || window._pendingSharedText;
        if (!text) return;
        window._pendingSharedText = null;
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        const url = urlMatch ? urlMatch[0] : text;
        setWebImportUrl(url);
        toast?.('Shared link loaded into Web Importer.', 'info');
      };

      window.addEventListener('incoming-android-share', handleShare);
      if (window._pendingSharedText) {
        handleShare({ detail: { text: window._pendingSharedText } });
      }

      return () => {
        active = false;
        window.removeEventListener('incoming-android-share', handleShare);
      };
    }, []);

    const handleLofterInAppLogin = async () => {
      setIsLofterConnecting(true);
      try {
        if (window.NativeBridge?.openLofterLoginSheet) {
          const res = await window.NativeBridge.openLofterLoginSheet();
          if (res && res.success) {
            const auth = await window.GeminiNovelDB.getSiteAuth('lofter');
            setLofterAuth(auth);
            toast?.('Lofter account session connected successfully.', 'success');
            setShowLofterModal(false);
          } else {
            toast?.(res?.error || 'Login cancelled.', 'info');
          }
        } else {
          window.open('https://www.lofter.com/front/login', '_blank');
          toast?.('Opened Lofter login in new tab. After logging in, paste your session cookie in the manual box.', 'info');
        }
      } catch (err) {
        toast?.('Login error: ' + (err.message || err), 'error');
      } finally {
        setIsLofterConnecting(false);
      }
    };

    const handleSaveLofterCookie = async (rawCookie) => {
      const trimmed = (rawCookie || '').trim();
      if (!trimmed) {
        toast?.('Please paste a cookie string first.', 'warning');
        return;
      }
      try {
        if (window.GeminiNovelDB?.saveSiteAuth) {
          await window.GeminiNovelDB.saveSiteAuth('lofter', {
            siteId: 'lofter',
            cookieString: trimmed,
            updatedAt: new Date().toISOString()
          });
        }
        if (window.NativeBridge?.setSiteCookie) {
          await window.NativeBridge.setSiteCookie('https://www.lofter.com', trimmed);
        }
        const auth = await window.GeminiNovelDB.getSiteAuth('lofter');
        setLofterAuth(auth);
        toast?.('Lofter cookie saved to account vault.', 'success');
        setShowLofterModal(false);
      } catch (e) {
        toast?.('Failed to save cookie: ' + e.message, 'error');
      }
    };

    const handleDisconnectLofter = async () => {
      try {
        if (window.GeminiNovelDB?.deleteSiteAuth) {
          await window.GeminiNovelDB.deleteSiteAuth('lofter');
        }
        setLofterAuth(null);
        toast?.('Lofter session disconnected.', 'info');
      } catch (e) {
        toast?.('Failed to disconnect: ' + e.message, 'error');
      }
    };
    const [booksDownloadableOnly, setBooksDownloadableOnly] = useState(true);
    const [isScoutingUrl, setIsScoutingUrl] = useState(false);
    const [scoutStatusText, setScoutStatusText] = useState('');
    const [crawlerSpeedMode, setCrawlerSpeedMode] = useState(() => {
      try {
        return localStorage.getItem('gemini_crawler_speed_mode') || 'builtin';
      } catch (_) {
        return 'builtin';
      }
    });
    const [isFlatChapterView, setIsFlatChapterView] = useState(() => {
      try {
        return localStorage.getItem('gemini_flat_chapter_view') === 'true';
      } catch (_) {
        return false;
      }
    });
    const toggleCrawlerSpeedMode = () => {
      const next = crawlerSpeedMode === 'builtin' ? 'recipe' : 'builtin';
      setCrawlerSpeedMode(next);
      try {
        localStorage.setItem('gemini_crawler_speed_mode', next);
      } catch (_) {}
      toast?.(next === 'builtin' ? 'Speed Mode: Fast Built-in Speed (Multi-worker pool)' : 'Speed Mode: Safe Recipe Delay (Polite delay)', 'info');
    };
    const [importCategoryTab, setImportCategoryTab] = useState(() => {
      if (isBookSearchMode) return 'books';
      if (isSwiftAudioMode) return 'audio';
      if (novelSearchFilter === 'Lnori') return 'ln';
      return 'wn';
    });

    useEffect(() => {
      if (novelSearchFilter === 'all' && importCategoryTab === 'ln') {
        setImportCategoryTab('wn');
      } else if (novelSearchFilter === 'Lnori' && importCategoryTab !== 'ln') {
        setImportCategoryTab('ln');
      }
    }, [novelSearchFilter]);

    const getSafeChapters = (obj) => {
      if (!obj) return [];
      const chs = Array.isArray(obj.chapters) ? obj.chapters : (obj.chapters && typeof obj.chapters === 'object' ? Object.values(obj.chapters).filter(c => c && typeof c === 'object') : []);
      const rawChs = Array.isArray(obj.rawChapters) ? obj.rawChapters : [];
      const transChs = Array.isArray(obj.translatedChapters) ? obj.translatedChapters : [];

      const chsHasText = chs.some(c => c && ((c.text || c.content || '').length > 20));
      const rawHasText = rawChs.some(c => c && ((c.text || c.content || '').length > 20));
      const transHasText = transChs.some(c => c && ((c.text || c.content || '').length > 20));

      if (rawHasText && (!chsHasText || rawChs.length >= chs.length)) {
        return rawChs;
      }
      if (transHasText && (!chsHasText || transChs.length >= chs.length)) {
        return transChs;
      }
      if (chs.length > 0) {
        if (rawChs.length > 0 && !chsHasText) {
          return chs.map((c, i) => {
            const match = rawChs[i] || rawChs.find(rc => rc.title === c.title || (rc.url && rc.url === c.url));
            return {
              ...c,
              text: c.text || c.content || match?.text || match?.content || '',
              content: c.content || c.text || match?.content || match?.text || ''
            };
          });
        }
        return chs;
      }
      if (rawChs.length > 0) return rawChs;
      if (transChs.length > 0) return transChs;
      return [];
    };

    const getSafeChapterCount = (obj) => {
      if (!obj) return 0;
      const chs = getSafeChapters(obj);
      if (chs.length > 0) return chs.length;
      if (typeof obj.chapters === 'number') return obj.chapters;
      if (typeof obj.totalChapterCount === 'number') return obj.totalChapterCount;
      if (typeof obj.chapterCount === 'number') return obj.chapterCount;
      if (Array.isArray(obj.chapterList)) return obj.chapterList.length;
      return 0;
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

              const handleAutoScoutSite = async () => {
                const targetUrl = (webImportUrl || '').trim();
                if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
                  toast?.('Please paste a full website link (https://...) first.', 'warning');
                  return;
                }
                const RE = typeof window !== 'undefined' ? window.SiteRecipeEngine : null;
                if (!RE || !RE.Controller || typeof RE.Controller.scoutWebsite !== 'function') {
                  toast?.('Site Scout engine not loaded.', 'error');
                  return;
                }
                setIsScoutingUrl(true);
                setScoutStatusText('Starting Scout...');
                try {
                  const res = await RE.Controller.scoutWebsite(targetUrl, {
                    onProgress: (stage, msg) => {
                      setScoutStatusText(msg);
                      toast?.(msg, 'info');
                    }
                  });
                  if (res && res.recipe) {
                    if (res.stats && res.stats.chaptersCount >= 2) {
                      toast?.(`Site scouted & recipe saved (${res.stats.chaptersCount} chapters)! Loading chapters...`, 'success');
                      setTimeout(() => {
                        handleStartFetch(false);
                      }, 600);
                    } else {
                      toast?.(`Recipe saved, but only ${res.stats?.chaptersCount || 0} chapter(s) detected. Please check the chapter link in Site Settings before fetching.`, 'warning');
                    }
                  }
                } catch (err) {
                  toast?.(`Scout: ${err.message}`, 'error');
                } finally {
                  setIsScoutingUrl(false);
                  setScoutStatusText('');
                }
              };

              return h(React.Fragment, null,
                // Actionable Cloudflare & Crawler Interruption Guidance Card
                webImportError && h('div', {
                  className: 'stu-notice-banner',
                  style: {
                    background: webImportError.isCloudflare ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    borderColor: webImportError.isCloudflare ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                    marginBottom: 12,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      webImportError.isCloudflare ? ic('Shield', 14) : ic('AlertCircle', 14),
                      h('span', { style: { fontSize: 12, fontWeight: 700, color: webImportError.isCloudflare ? '#f87171' : '#fbbf24' } },
                        webImportError.isCloudflare ? 'Security Challenge Detected' : 'Crawl Paused to Protect Data'
                      )
                    ),
                    h('button', {
                      type: 'button',
                      style: { background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', fontSize: 14, padding: '2px 6px', display: 'inline-flex', alignItems: 'center' },
                      onClick: () => setWebImportError(null)
                    }, ic('X', 14))
                  ),
                  h('div', { style: { fontSize: 11.5, color: 'var(--paper)', lineHeight: 1.45, marginBottom: 8 } },
                    webImportError.message || (webImportError.isCloudflare ? 'The remote novel website has active human verification or anti-bot rate limits.' : 'Crawl paused due to consecutive connection failures.')
                  ),
                  webImportError.partialCount > 0 && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#34d399', marginBottom: 8, fontWeight: 600 } },
                    ic('Check', 12),
                    `${webImportError.partialCount} chapter(s) were safely saved to your Library before the pause.`
                  ),
                  h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '8px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: () => {
                        setWebImportError(null);
                        handleStartFetch(true);
                      }
                    }, ic('Play', 12), 'Resume Fetch'),
                    webImportError.targetUrl && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: webImportError.isCloudflare ? 'rgba(234, 179, 8, 0.6)' : 'rgba(56, 189, 248, 0.4)', color: webImportError.isCloudflare ? '#facc15' : '#38bdf8', fontWeight: 600, padding: '8px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: async () => {
                        const targetUrl = webImportError.targetUrl;
                        if (window.NativeBridge?.openInAppBrowser || window.NativeBridge?.resolveCloudflare) {
                          toast?.('Opening in-app browser to pass verification...', 'info');
                          try {
                            const solver = window.NativeBridge.openInAppBrowser || window.NativeBridge.resolveCloudflare;
                            const res = await solver(targetUrl);
                            if (res?.success || res?.status === 'ok') {
                              toast?.('Verification passed! Resuming chapter crawl...', 'success');
                              setWebImportError(null);
                              handleStartFetch(true);
                            }
                          } catch (err) {
                            toast?.('Verification window closed: ' + err.message, 'warning');
                          }
                        } else {
                          window.open(targetUrl, '_blank');
                        }
                      }
                    }, webImportError.isCloudflare ? ic('Shield', 13) : ic('Globe', 13), webImportError.isCloudflare ? 'Solve Captcha (In-App Browser)' : 'Open Source in Browser'),
                    (webImportError.targetUrl || webImportUrl) && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      disabled: isScoutingUrl,
                      onClick: handleAutoScoutSite
                    }, isScoutingUrl ? ic('Loader2', 13, 'animate-spin') : ic('Sparkles', 13), isScoutingUrl ? 'Scouting...' : 'Auto-Scout & Learn Site'),
                    (webImportError.targetUrl || webImportUrl) && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(234, 179, 8, 0.5)', color: '#eab308', fontWeight: 600, padding: '8px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: () => {
                        const targetUrl = webImportError.targetUrl || webImportUrl;
                        if (typeof openSiteRecipeEditor === 'function') {
                          openSiteRecipeEditor({ url: targetUrl });
                        } else if (typeof window !== 'undefined' && window.SiteRecipeEngine?.Controller?.open) {
                          window.SiteRecipeEngine.Controller.open({ url: targetUrl });
                        }
                      }
                    }, ic('Sliders', 13), 'Set up this site manually'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '8px 16px', borderRadius: 999, color: 'var(--slate)', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: () => {
                        setActiveTab('text');
                        toast('Switched to Translate tab: paste text or upload EPUB directly.', 'info');
                      }
                    }, ic('Upload', 13), 'Tab 1 / Upload EPUB')
                  )
                ),
                // Incomplete Crawl Session Banner (only shown when returning to tab, suppressed when actively paused in card)
                activeCrawlSession && !isFetchingPaused && !isFetchingUrl && h('div', {
                  className: 'stu-notice-banner',
                  style: {
                    background: 'rgba(234, 179, 8, 0.08)',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    marginBottom: 12,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#eab308' } }, ic('Clock', 13), 'Incomplete Crawl Session Detected'),
                    h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, `${getSafeChapterCount(activeCrawlSession)} / ${activeCrawlSession.totalChapterCount || '?'} chapters`)
                  ),
                  h('div', { style: { fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--paper)' } }, activeCrawlSession.title || 'Untitled Web Novel'),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 },
                      disabled: isFetchingUrl,
                      onClick: () => handleStartFetch(true)
                    }, ic('Play', 12), 'Resume Fetch'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 },
                      onClick: async () => {
                        const chs = getSafeChapters(activeCrawlSession);
                        if (chs.length === 0) return toast('No chapters available to download.', 'warning');
                        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(activeCrawlSession.title, chs) : (activeCrawlSession.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(activeCrawlSession.author) : (activeCrawlSession.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        try {
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: activeCrawlSession?.id || activeCrawlSession?.sourceUrl || novelTitle, coverUrl: activeCrawlSession?.cover || '' }) : { coverUrl: activeCrawlSession?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const isInc = activeCrawlSession?.isIncomplete || (activeCrawlSession?.totalChapterCount && chs.length < activeCrawlSession.totalChapterCount);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeCrawlSession));
                          toast(`EPUB (${chs.length} chapters) downloaded successfully!`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, ic('Download', 12), `Download EPUB (${getSafeChapterCount(activeCrawlSession)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 },
                      onClick: () => {
                        const chs = getSafeChapters(activeCrawlSession);
                        if (chs.length === 0) return toast('No chapters downloaded yet to read.', 'warning');
                        const mappedChs = chs.map((c, idx) => ({
                          title: c.title || `Chapter ${idx + 1}`,
                          text: c.text || c.content || '',
                          content: c.text || c.content || '',
                          originalTitle: c.originalTitle || c.title || `Chapter ${idx + 1}`,
                          arc: c.arc || c.volume || '',
                          volume: c.volume || c.arc || '',
                          level: c.level !== undefined ? c.level : 1,
                          images: Array.isArray(c.images) ? c.images : [],
                          isTranslated: false
                        }));
                        setChapters(mappedChs);
                        setTranslatedChapters([]);
                        setAssembledText('');
                        if (typeof setReaderChapters === 'function') {
                          setReaderChapters(mappedChs);
                        }
                        if (typeof setActiveNovelRecord === 'function') {
                          setActiveNovelRecord(activeCrawlSession);
                        }
                        const novelKey = activeCrawlSession?.id || activeCrawlSession?.title || 'web_crawl_novel';
                        setReaderNovelId(novelKey);
                        setReaderNovelTitle(activeCrawlSession?.title || 'Web Novel');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${activeCrawlSession?.title || 'Novel'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        } else {
                          toast(`Opening "${activeCrawlSession?.title || 'Novel'}" in reader!`, 'success');
                        }
                      }
                    }, ic('BookOpen', 12), `Read (${getSafeChapterCount(activeCrawlSession)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      onClick: () => {
                        const chs = getSafeChapters(activeCrawlSession);
                        const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                        setInputText(fullText);
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setAssembledText('');
                        setTranslatedChapters([]);
                        setActiveNovelRecord(activeCrawlSession);
                        setCurrentDocCover(activeCrawlSession?.cover || '');
                        setFileName(activeCrawlSession?.title || 'Web Novel');
                        setCurrentDocTitle(activeCrawlSession?.title || 'Web Novel');
                        setActiveTab('text');
                        const totalChs = activeCrawlSession?.totalChapterCount || activeCrawlSession?.chapterList?.length || 0;
                        if (totalChs > 0 && chs.length < totalChs) {
                          toast(`Loaded ${chs.length} of ${totalChs} downloaded chapters to Translator. To translate all ${totalChs}, tap "Resume Fetch" first!`, 'warning');
                        } else {
                          toast(`Loaded ${chs.length} chapters to Translator! Tap "Translate" below to begin translating.`, 'info');
                        }
                      }
                    }, `Send to Translator (${getSafeChapterCount(activeCrawlSession)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { display: 'inline-flex', alignItems: 'center', gap: 5 },
                      disabled: isFetchingUrl,
                      onClick: dismissCrawlSession
                    }, ic('X', 12), 'Dismiss')
                  )
                ),

                // Apple-style Header
                h('div', { className: 'apple-page-header', style: { marginBottom: 14 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 } },
                    h('div', null,
                      h('h1', { style: { fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: '0 0 2px' } }, 'Discover'),
                      h('p', { style: { fontSize: 13, color: '#94A3B8', margin: 0 } }, 'Curated Light Novels, Web Serials, Books & Audio')
                    ),
                    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)', display: 'inline-flex', alignItems: 'center', gap: 5 },
                        onClick: () => {
                          setImportCategoryTab('wn');
                          handleResetImportTab();
                        },
                        title: 'Reset Web Importer tab to clean state'
                      }, ic('RotateCcw', 12), 'Reset')
                    )
                  )
                ),
                h('div', {
                  className: 'src-chips',
                  style: {
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 10
                  }
                },
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: {
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 11.5
                      },
                      onClick: () => ongoingEpubInputRef.current?.click(),
                      title: 'Upload an existing EPUB to auto-search sources and fetch new chapters'
                    }, ic('Zap', 13), 'Continue EPUB'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        color: 'var(--paper-dim)',
                        border: '1px solid var(--hairline)'
                      },
                      onClick: () => setSourcesModalOpen(true),
                      title: 'View all supported built-in websites, formats, and plugins'
                    }, ic('Info', 13), 'Sources'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        color: 'var(--iris)',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      },
                      onClick: handleOpenSourcePluginsModal,
                      title: 'Manage built-in source plugins and browse community plugins'
                    }, ic('Sliders', 13), 'Plugins'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        color: (webImportUrl && typeof window !== 'undefined' && window.SiteRecipeEngine?.findForUrl(webImportUrl)) ? '#10b981' : 'var(--accent, #6366f1)',
                        border: (webImportUrl && typeof window !== 'undefined' && window.SiteRecipeEngine?.findForUrl(webImportUrl)) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)'
                      },
                      onClick: () => {
                        const targetUrl = (webImportUrl || '').trim();
                        if (typeof openSiteRecipeEditor === 'function') {
                          openSiteRecipeEditor({ url: targetUrl });
                        } else if (typeof window !== 'undefined' && window.SiteRecipeEngine?.Controller?.open) {
                          window.SiteRecipeEngine.Controller.open({ url: targetUrl });
                        }
                      },
                      title: 'Configure custom HTML extraction rules for this website'
                    }, ic('Settings', 13), (webImportUrl && typeof window !== 'undefined' && window.SiteRecipeEngine?.findForUrl(webImportUrl)) ? 'Site Settings (Active)' : 'Site Settings'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        color: crawlerSpeedMode === 'builtin' ? '#34d399' : '#fbbf24',
                        border: crawlerSpeedMode === 'builtin' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(251, 191, 36, 0.4)'
                      },
                      onClick: toggleCrawlerSpeedMode,
                      title: crawlerSpeedMode === 'builtin'
                        ? 'Fast Built-in Speed: Blazing-fast multi-worker crawling (Click to switch to Safe Recipe Delay)'
                        : 'Safe Recipe Delay: Respects site recipe rate limits and polite delay (Click to switch to Fast Built-in Speed)'
                    }, ic(crawlerSpeedMode === 'builtin' ? 'Zap' : 'Clock', 12), crawlerSpeedMode === 'builtin' ? 'Fast Built-in Speed' : 'Safe Recipe Delay'),
                    (/^https?:\/\//i.test((webImportUrl || '').trim())) && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: {
                        padding: '6px 12px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                      },
                      disabled: isScoutingUrl,
                      onClick: handleAutoScoutSite,
                      title: 'Autonomously scout, learn, and save extraction rules for this website'
                    }, isScoutingUrl ? ic('Loader2', 13, 'animate-spin') : ic('Sparkles', 13), isScoutingUrl ? 'Scouting...' : 'Auto-Scout'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '6px 11px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)'
                      },
                      onClick: () => {
                        setImportCategoryTab('wn');
                        handleResetImportTab();
                      },
                      title: 'Reset Web Importer tab to clean state'
                    }, ic('RotateCcw', 12), 'Reset Tab')
                  )
                ),
                (isScoutingUrl && scoutStatusText) && h('div', {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#c7d2fe',
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 10
                  }
                },
                  ic('Loader2', 14, 'animate-spin'),
                  h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, scoutStatusText)
                ),

                // ── 4 MEDIA CATEGORY TABS ──
                h('div', { className: 'discover-cat-bar' },
                  h('button', {
                    type: 'button',
                    className: `discover-cat-pill ${importCategoryTab === 'wn' ? 'active' : ''}`,
                    style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                    onClick: () => {
                      setImportCategoryTab('wn');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('all');
                    }
                  }, ic('Globe', 14), 'Web Novels'),
                  h('button', {
                    type: 'button',
                    className: `discover-cat-pill ${importCategoryTab === 'ln' ? 'active' : ''}`,
                    style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                    onClick: () => {
                      setImportCategoryTab('ln');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('Lnori');
                    }
                  }, ic('BookOpen', 14), 'Light Novels'),
                  h('button', {
                    type: 'button',
                    className: `discover-cat-pill ${importCategoryTab === 'books' ? 'active' : ''}`,
                    style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                    onClick: () => {
                      setImportCategoryTab('books');
                      setIsBookSearchMode(true);
                      setIsSwiftAudioMode(false);
                    }
                  }, ic('Library', 14), 'Books'),
                  h('button', {
                    type: 'button',
                    className: `discover-cat-pill ${importCategoryTab === 'audio' ? 'active' : ''}`,
                    style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                    onClick: () => {
                      setImportCategoryTab('audio');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(true);
                    }
                  }, ic('Headphones', 14), 'Audiobooks'),
                  h('button', {
                    type: 'button',
                    className: `discover-cat-pill ${lofterAuth?.cookieString ? 'active' : ''}`,
                    style: {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: lofterAuth?.cookieString ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: lofterAuth?.cookieString ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      color: lofterAuth?.cookieString ? '#34d399' : 'var(--text-muted, #94a3b8)'
                    },
                    onClick: () => setShowLofterModal(true),
                    title: lofterAuth?.cookieString ? 'Lofter account session connected' : 'Connect Lofter account for locked chapters'
                  }, ic('Shield', 14), lofterAuth?.cookieString ? 'Lofter Connected' : 'Lofter Account')
                ),

                h('div', { className: 'apple-search-wrap' },
                  h('div', { className: 'apple-search-bar' },
                    ic('Search', 16, 'apple-search-icon'),
                    h('input', {
                      id: 'discover-search-input',
                      className: 'apple-search-input',
                      type: 'text',
                      placeholder: (importCategoryTab === 'books' || isBookSearchMode)
                        ? 'Search classics, titles, or authors…'
                        : (importCategoryTab === 'audio' || isSwiftAudioDetected)
                          ? 'Search free spoken audiobooks or paste audio link…'
                          : (importCategoryTab === 'ln')
                            ? 'Search light novels or paste series link…'
                            : 'Search web novels, paste URL, or drop link…',
                      value: webImportUrl,
                      onChange: (e) => {
                        setWebImportUrl(e.target.value);
                        if (!e.target.value.trim() && importCategoryTab !== 'audio') setIsSwiftAudioMode(false);
                      },
                      onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const q = (webImportUrl || '').trim();
                          if (!q) return;
                          if (/^https?:\/\//i.test(q)) {
                            handleStartFetch(false);
                          } else if (importCategoryTab === 'books' || isBookSearchMode) {
                            handleSearchBooks(q);
                          } else if (importCategoryTab === 'audio' || isSwiftAudioDetected) {
                            handleSwiftAudioSearch(q);
                          } else if (importCategoryTab === 'ln') {
                            handleSearchNovels(q, 'Lnori');
                          } else {
                            handleSearchNovels(q, novelSearchFilter || 'all');
                          }
                        }
                      }
                    }),
                    isLofterUrl && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: {
                        padding: '3px 8px',
                        fontSize: 11,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 6,
                        marginRight: 4,
                        color: lofterAuth?.cookieString ? '#34d399' : '#818cf8',
                        background: lofterAuth?.cookieString ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'
                      },
                      onClick: () => setShowLofterModal(true),
                      title: 'Lofter Account Session'
                    }, ic('Shield', 11), lofterAuth?.cookieString ? 'Connected' : 'Lofter Login'),
                    webImportUrl && h('button', {
                      type: 'button',
                      className: 'apple-search-clear',
                      style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
                      onClick: () => {
                        setWebImportUrl('');
                        if (importCategoryTab !== 'audio') setIsSwiftAudioMode(false);
                      },
                      title: 'Clear search'
                    }, ic('X', 12))
                  )
                ),

                // ── CLEAN DISCOVER HERO (IDLE STATE) ──
                (!webImportUrl.trim() && !isFetchingUrl && !isFetchingPaused && !activeNovelView && (!novelSearchResults || novelSearchResults.length === 0) && (!bookSearchResults || bookSearchResults.length === 0) && (!swiftAudioResults || swiftAudioResults.length === 0)) && h('div', {
                  className: 'discover-curated-container',
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '48px 20px',
                    margin: '16px auto',
                    maxWidth: 580,
                    background: 'var(--card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: 16
                  }
                },
                  h('div', {
                    style: {
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--iris, #818cf8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16
                    }
                  }, ic('Compass', 28)),
                  h('div', {
                    style: {
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--paper, #f1f5f9)',
                      marginBottom: 8
                    }
                  }, 'Discover & Read Novels'),
                  h('div', {
                    style: {
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--paper-dim, #94a3b8)',
                      maxWidth: 420
                    }
                  }, 'Search web novels, light novels, and classics, or paste any direct chapter web link above to import chapters directly into your library.')
                ),

                // ── COMPACT DISCOVERY SOURCE SHELF (WHEN SEARCHING) ──
                Boolean(webImportUrl.trim()) && h('div', { className: 'discover-source-shelf' },
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${bookSearchFilter === 'standardebooks' && isBookSearchMode ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('books');
                      setIsBookSearchMode(true);
                      setBookSearchFilter('standardebooks');
                      if (webImportUrl.trim()) handleSearchBooks(webImportUrl.trim());
                      else toast('Standard Ebooks: search curated, beautifully typeset public domain editions.', 'info');
                    }
                  },
                    ic('Sparkles', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#34d399' } }, 'Standard Ebooks'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Typeset Classics')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${bookSearchFilter === 'gutenberg' && isBookSearchMode ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('books');
                      setIsBookSearchMode(true);
                      setBookSearchFilter('gutenberg');
                      if (webImportUrl.trim()) handleSearchBooks(webImportUrl.trim());
                      else toast('Project Gutenberg: search 70,000+ curated classical books.', 'info');
                    }
                  },
                    ic('Library', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#60a5fa' } }, 'Gutenberg'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, '70,000+ Titles')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${novelSearchFilter === 'Lnori' && importCategoryTab === 'ln' ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('ln');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('Lnori');
                      if (webImportUrl.trim()) handleSearchNovels(webImportUrl.trim(), 'Lnori');
                      else toast('Lnori: 1-click clean EPUB download for light novels.', 'info');
                    }
                  },
                    ic('BookOpen', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#c084fc' } }, 'Lnori LNs'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, '1-Click EPUB')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${novelSearchFilter === 'RoyalRoad' ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('wn');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('RoyalRoad');
                      if (webImportUrl.trim()) handleSearchNovels(webImportUrl.trim(), 'RoyalRoad');
                      else toast('Royal Road: original web fiction & fantasy serials.', 'info');
                    }
                  },
                    ic('Globe', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#38bdf8' } }, 'Royal Road'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Fantasy Serials')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${novelSearchFilter === 'Wattpad' ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('wn');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('Wattpad');
                      if (webImportUrl.trim()) handleSearchNovels(webImportUrl.trim(), 'Wattpad');
                      else toast('Wattpad: community stories, web novels, and original fiction.', 'info');
                    }
                  },
                    ic('Globe', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#ff6122' } }, 'Wattpad'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Stories & Fiction')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: `discover-source-card ${isSwiftAudioMode ? 'active' : ''}`,
                    onClick: () => {
                      setImportCategoryTab('audio');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(true);
                      if (webImportUrl.trim()) handleSwiftAudioSearch(webImportUrl.trim());
                      else toast('SwiftAudiobooks: free audiobooks & track player.', 'info');
                    }
                  },
                    ic('Headphones', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#f472b6' } }, 'Audiobooks'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Spoken Audio')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: 'discover-source-card',
                    onClick: () => {
                      const q = (webImportUrl || '').trim();
                      const targetUrl = q ? `https://oceanofpdf.com/?s=${encodeURIComponent(q)}` : 'https://oceanofpdf.com/';
                      window.open(targetUrl, '_blank');
                      toast(q ? `Opening OceanOfPDF EPUB search for "${q}"…` : 'Opening OceanOfPDF library in browser…', 'info');
                    },
                    title: 'Search OceanOfPDF for 1-click curated EPUB downloads'
                  },
                    ic('Download', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24' } }, 'OceanOfPDF'),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'EPUB Mirror')
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: 'discover-source-card',
                    onClick: () => {
                      const q = (webImportUrl || '').trim();
                      const targetUrl = q ? `https://annas-archive.org/search?q=${encodeURIComponent(q)}&ext=epub` : 'https://annas-archive.org/';
                      window.open(targetUrl, '_blank');
                      toast(q ? `Opening Anna's Archive EPUB search for "${q}"…` : 'Opening Anna\'s Archive in browser…', 'info');
                    },
                    title: "Search Anna's Archive for complete community EPUB editions"
                  },
                    ic('Compass', 16),
                    h('div', { style: { textAlign: 'left' } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: '#f472b6' } }, "Anna's Archive"),
                      h('div', { style: { fontSize: 10, color: 'var(--slate)' } }, 'Shadow Library')
                    )
                  )
                ),

                // Lnori Detection Card & Direct 1-Click EPUB Button
                isLnoriUrl && !isFetchingUrl && h('div', {
                  className: 'stu-notice-banner',
                  style: {
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.12))',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    padding: '12px 14px',
                    margin: '8px 0 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }
                },
                  h('div', { style: { flex: '1 1 240px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--paper)', fontSize: 13.5 } },
                      ic('Sparkles', 15),
                      h('span', null, 'Lnori Light Novel Detected'),
                      h('span', { className: 'chip', style: { color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', fontSize: 10.5 } }, 'English Original')
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                      'Lnori books are in official English with illustrations & volume hierarchy. Direct EPUB export produces a 100% clean book without translating!'
                    )
                  ),
                  h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    style: {
                      background: 'linear-gradient(90deg, #6366f1, #10b981)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '8px 14px',
                      border: 'none',
                      fontSize: 12,
                      boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    },
                    title: 'Directly download from Lnori and package clean EPUB with cover art and volume hierarchy',
                    onClick: () => handleLnoriDirectEpubDownload(webImportUrl)
                  }, ic('Zap', 13), '1-Click Download Clean EPUB')
                ),

                // Curated Web Novel Archive Dedicated Command Card
                isWitchCultUrl && !isFetchingUrl && (() => {
                  const existingRezero = (webImportHistory || []).find(n => /witchcult|rezero/i.test(n?.sourceUrl || n?.url || n?.title || ''))
                    || (activeCrawlSession && /witchcult|rezero/i.test(activeCrawlSession?.sourceUrl || activeCrawlSession?.url || activeCrawlSession?.title || '') ? activeCrawlSession : null);
                  const existingChCount = existingRezero?.chapters?.length || existingRezero?.rawChapters?.length || 0;

                  return h('div', {
                    className: 'stu-notice-banner',
                    style: {
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.14), rgba(16, 185, 129, 0.12))',
                      border: '1px solid rgba(168, 85, 247, 0.45)',
                      padding: '12px 14px',
                      margin: '8px 0 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      borderRadius: 8
                    }
                  },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' } },
                      h('div', { style: { flex: '1 1 240px' } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--paper)', fontSize: 13.5 } },
                          ic('BookOpen', 15),
                          h('span', null, 'Curated Web Novel Archive'),
                          h('span', { className: 'chip', style: { color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)', fontSize: 10.5 } }, 'Complete Edition')
                        ),
                        h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2, lineHeight: 1.4 } },
                          'Includes all canonical story arcs, side stories, and alternate route chapters decoded and formatted into a unified archive.'
                        ),
                        existingChCount > 0 && h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 } },
                          ic('Check', 12),
                          `Saved in Library: ${existingChCount} chapters downloaded locally.`
                        )
                      ),
                      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                        h('button', {
                          type: 'button',
                          className: 'mini-btn',
                          style: {
                            background: 'linear-gradient(90deg, #a855f7, #7c3aed)',
                            color: '#fff',
                            fontWeight: 700,
                            padding: '8px 14px',
                            border: 'none',
                            fontSize: 12,
                            boxShadow: '0 2px 10px rgba(168, 85, 247, 0.35)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          },
                          onClick: () => handleStartFetch(false, null, false, 'https://witchculttranslation.com/table-of-content/')
                        }, ic('Download', 13), 'Ingest Curated Novel'),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn',
                          style: {
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            fontWeight: 700,
                            padding: '8px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          },
                          onClick: handleCheckRezeroUpdates
                        }, ic('RefreshCw', 13), 'Check for Updates'),
                        existingChCount > 0 && h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { borderColor: 'rgba(255, 255, 255, 0.2)', fontWeight: 600, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 6 },
                          onClick: async () => {
                            const chs = existingRezero?.chapters || [];
                            if (chs.length === 0) return toast('No chapters available to download.', 'warning');
                            const novelTitle = 'Curated Web Novel';
                            const novelAuthor = 'Archive Author';
                            try {
                              setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 10 });
                              const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                                setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                              }, { coverUrl: existingRezero?.cover || '' });
                              const epubFileName = `${novelTitle} (${chs.length} Ch).epub`;
                              await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(existingRezero));
                              toast(`EPUB (${chs.length} chapters) downloaded successfully!`, 'success');
                            } catch (err) {
                              toast('EPUB generation error: ' + err.message, 'error');
                            } finally {
                              setEpubPackagingModal(null);
                            }
                          }
                        }, ic('Download', 12), `Download EPUB (${existingChCount})`)
                      )
                    )
                  );
                })(),

                // SwiftAudiobooks Detection Card (only for specific book URLs)
                isSpecificSwiftAudioBook && !isFetchingUrl && h('div', {
                  className: 'stu-notice-banner',
                  style: {
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.12))',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    padding: '12px 14px',
                    margin: '8px 0 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap'
                  }
                },
                  h('div', { style: { flex: '1 1 220px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--paper)', fontSize: 13.5 } },
                      ic('Headphones', 15),
                      h('span', null, 'SwiftAudiobooks Detected'),
                      h('span', { className: 'chip', style: { color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.4)', fontSize: 10.5 } }, 'Audiobook Stream')
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2 } },
                      'Stream with 5-second jump controls, sleep timer, and batch MP3 downloading directly to novel folders!'
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #6366f1, #ec4899)', color: '#fff', fontWeight: 700, padding: '8px 14px', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      disabled: isSwiftAudioSearching,
                      onClick: () => handleStartPlayAudiobook({ url: webImportUrl })
                    }, ic('Play', 12), 'Listen Now'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { fontWeight: 600, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      disabled: isSwiftAudioSearching,
                      onClick: () => handleOpenAudioDownload({ url: webImportUrl })
                    }, ic('Download', 12), 'Download MP3s')
                  )
                ),
                
                // In-line Packaging Progress on Main Screen
                epubPackagingModal && h('div', {
                  className: 'stu-notice-banner',
                  style: {
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.35)',
                    padding: '12px 14px',
                    margin: '8px 0 10px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      ic('Layers', 15),
                      h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, `Packaging: ${epubPackagingModal.title || 'Novel'}`)
                    ),
                    h('span', { style: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: 'var(--accent, #6366f1)', fontSize: 13 } }, `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`)
                  ),
                  h('div', { style: { width: '100%', height: 5, borderRadius: 99, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', margin: '4px 0 6px' } },
                    h('div', { style: { height: '100%', width: `${Math.min(100, Math.max(0, epubPackagingModal.pct || 0))}%`, background: 'linear-gradient(90deg, #6366f1, #10b981)', transition: 'width 0.25s' } })
                  ),
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--slate)' } },
                    h('span', null, epubPackagingModal.status || 'Compiling chapters...'),
                    epubPackagingModal.elapsed && h('span', { style: { fontFamily: "'IBM Plex Mono', monospace" } }, `⏱ ${epubPackagingModal.elapsed}`)
                  )
                ),
                isFetchingPaused ? (
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, margin: '8px 0' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 4px', background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, fontSize: 11 },
                      onClick: () => handleStartFetch(true)
                    }, '▶ Resume Fetch'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 4px', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, fontSize: 11 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters downloaded yet to export.', 'warning');
                        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(full.title || activeNovelView.title, chs) : (full.title || activeNovelView.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(full.author || activeNovelView.author) : (full.author || activeNovelView.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        try {
                          if (full && full.epubBlob && !full.isEdited && !activeNovelView?.isEdited && (full.isEpub || full.isTranslated)) {
                            const isInc = full.isIncomplete || (full.totalChapterCount && chs.length < full.totalChapterCount);
                            const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                            await saveUniversalBlob(full.epubBlob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(full || activeNovelView));
                            toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                            return;
                          }
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: full?.id || activeNovelView?.id || activeNovelView?.sourceUrl || novelTitle, coverUrl: full?.cover || activeNovelView?.cover || '' }) : { coverUrl: full?.cover || activeNovelView?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const isInc = full.isIncomplete || activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(full || activeNovelView));
                          toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, ic('Download', 12), `Download EPUB (${getSafeChapterCount(activeNovelView)})`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 4px', background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters downloaded yet to read.', 'warning');
                        const isTrans = !!full?.isTranslated || !!activeNovelView?.isTranslated;
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
                        if (typeof setReaderChapters === 'function') {
                          setReaderChapters(mappedChs);
                        }
                        if (typeof setActiveNovelRecord === 'function') {
                          setActiveNovelRecord(full);
                        }
                        const novelKey = full?.id || activeNovelView?.id || activeNovelView?.title || 'web_import_novel';
                        setReaderNovelId(novelKey);
                        setReaderNovelTitle(full?.title || activeNovelView?.title || 'Web Novel');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${full?.title || activeNovelView?.title || 'Novel'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        } else {
                          toast(`Reading "${full?.title || activeNovelView?.title || 'Novel'}" (${chs.length} ch)!`, 'success');
                        }
                      }
                    }, ic('BookOpen', 12), `Read (${getSafeChapterCount(activeNovelView)})`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 4px', fontWeight: 600, fontSize: 11 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters downloaded yet to send.', 'warning');
                        const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                        setInputText(fullText);
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setActiveNovelRecord(full || activeNovelView);
                        setCurrentDocCover(full?.cover || activeNovelView?.cover || '');
                        setFileName(full?.title || activeNovelView.title || 'Web Novel');
                        setCurrentDocTitle(full?.title || activeNovelView.title || 'Web Novel');
                        setActiveTab('text');
                        toast(`Loaded "${full?.title || activeNovelView.title || 'Novel'}" (${chs.length} ch) to Translator!`, 'info');
                      }
                    }, `Send to Translate`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '10px 4px', fontWeight: 600, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
                      onClick: handleCancelFetch
                    }, ic('X', 12), 'Cancel')
                  )
                ) : !isFetchingUrl ? (
                  h(React.Fragment, null,
                    isSpecificSwiftAudioBook ? null : (
                      (importCategoryTab === 'books' || isBookSearchMode) ? (
                        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 6, margin: '6px 0' } },
                          h('button', {
                            type: 'button',
                            className: 'primary',
                            style: { background: 'linear-gradient(90deg, #10b981, #6366f1)', width: '100%', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                            disabled: !webImportUrl.trim() || isSearchingBooks,
                            onClick: () => handleSearchBooks(webImportUrl)
                          }, ic('Search', 15), isSearchingBooks ? 'Searching Book Catalogs…' : 'Search Books (Gutenberg, Standard Ebooks, LibGen, Open Library)')
                        )
                      ) : (importCategoryTab === 'audio' || isSwiftAudioDetected) ? (
                        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 6, margin: '6px 0' } },
                          h('button', {
                            type: 'button',
                            className: 'primary',
                            style: { background: 'linear-gradient(90deg, #6366f1, #ec4899)', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                            disabled: !webImportUrl.trim() || isSwiftAudioSearching,
                            onClick: () => handleSwiftAudioSearch(webImportUrl)
                          }, ic('Search', 15), isSwiftAudioSearching ? 'Searching Audiobooks…' : 'Search Audiobooks')
                        )
                      ) : (
                        h(React.Fragment, null,
                          h('div', { style: { display: 'grid', gridTemplateColumns: (!webImportUrl.trim() || !/^https?:\/\//i.test(webImportUrl.trim())) ? '1fr' : '1fr 1fr', gap: 6, margin: '6px 0' } },
                            isLnoriUrl ? (
                              h(React.Fragment, null,
                                h('button', {
                                  type: 'button',
                                  className: 'primary',
                                  style: { background: 'linear-gradient(90deg, #6366f1, #10b981)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleLnoriDirectEpubDownload(webImportUrl)
                                }, ic('Zap', 13), '1-Click Download Clean EPUB'),
                                h('button', {
                                  type: 'button',
                                  className: 'primary ghost',
                                  style: { fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleStartFetch(false)
                                }, ic('Download', 13), 'Scrape Chapters')
                              )
                            ) : (!webImportUrl.trim() || !/^https?:\/\//i.test(webImportUrl.trim())) ? (
                              h('button', {
                                type: 'button',
                                className: 'primary',
                                style: {
                                  background: importCategoryTab === 'ln'
                                    ? 'linear-gradient(90deg, #6366f1, #10b981)'
                                    : 'linear-gradient(90deg, #6366f1, #3b82f6)',
                                  width: '100%',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                },
                                disabled: !webImportUrl.trim() || isSearchingNovels,
                                onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all'))
                              }, ic('Search', 15), isSearchingNovels
                                ? 'Searching Supported Sources…'
                                : (importCategoryTab === 'ln' ? 'Search Light Novels (Lnori Catalog)' : 'Search Web Novels'))
                            ) : (
                              h(React.Fragment, null,
                                h('button', {
                                  type: 'button',
                                  className: 'primary',
                                  style: { fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleStartFetch(false)
                                }, ic('Download', 13), 'Fetch Novel URL'),
                                h('button', {
                                  type: 'button',
                                  className: 'primary ghost',
                                  style: { fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
                                  disabled: !webImportUrl.trim() || isSearchingNovels,
                                  onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all'))
                                }, ic('Search', 14), isSearchingNovels ? 'Searching…' : 'Search Title')
                              )
                            )
                          ),
                          (activeNovelView || webImportUrl.trim() || (novelSearchResults && novelSearchResults.length > 0)) && !isFetchingUrl && h('div', {
                            style: { display: 'flex', justifyContent: 'flex-end', marginTop: 4, marginBottom: 2 }
                          },
                            h('button', {
                              type: 'button',
                              className: 'mini-btn ghost',
                              style: { fontSize: 11, padding: '2px 8px', color: 'var(--slate)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
                              onClick: () => {
                                setImportCategoryTab('wn');
                                handleResetImportTab();
                              },
                              title: 'Reset import view and start fresh with another novel'
                            }, ic('RotateCcw', 11), 'Reset Tab')
                          )
                        )
                      )
                    )
                  )
                ) : (
                  h('div', { style: { display: 'grid', gridTemplateColumns: getSafeChapterCount(activeNovelView) > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6, margin: '6px 0' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
                      onClick: handlePauseFetch
                    }, ic('Pause', 12), 'Pause Fetch'),
                    getSafeChapterCount(activeNovelView) > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 6px', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters downloaded yet.', 'warning');
                        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(full.title || activeNovelView.title, chs) : (full.title || activeNovelView.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(full.author || activeNovelView.author) : (full.author || activeNovelView.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        try {
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: full?.id || activeNovelView?.id || activeNovelView?.sourceUrl || novelTitle, coverUrl: full?.cover || activeNovelView?.cover || '' }) : { coverUrl: full?.cover || activeNovelView?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const isInc = full.isIncomplete || activeNovelView?.isIncomplete || (activeNovelView?.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(full || activeNovelView));
                          toast(`EPUB (${chs.length} chapters) saved!`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, ic('Download', 12), `EPUB (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '10px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 },
                      onClick: handleCancelFetch
                    }, ic('X', 12), 'Cancel')
                  )
                ),

                isFetchingUrl && h('div', { className: 'status-row' },
                  h('span', null, webImportStatus || 'Extracting chapters…'),
                  h('div', { className: 'mini-progress' }, h('i'))
                ),

                isFetchingPaused && !isFetchingUrl && h('div', {
                  className: 'status-row',
                  style: { background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.25)', color: '#eab308', borderRadius: 4, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }
                },
                  ic('Pause', 13),
                  h('span', null, `Ingestion paused. ${getSafeChapterCount(activeNovelView)} chapters saved. Click "Resume Fetch" to continue.`)
                ),

                activeNovelView && (activeNovelView.isPlaylist ? (
                  h('div', { className: 'playlist-view-container', style: { display: 'flex', flexDirection: 'column', gap: 14 } },
                    h('div', {
                      className: 'discover-novel-hero',
                      style: {
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                        borderRadius: 12,
                        padding: 16
                      }
                    },
                      h('div', { className: 'discover-novel-cover', style: { width: 100, height: 140, borderRadius: 8, overflow: 'hidden', flexShrink: 0 } },
                        activeNovelView.cover
                          ? h('img', { src: activeNovelView.cover, alt: 'Playlist Cover', style: { width: '100%', height: '100%', objectFit: 'cover' } })
                          : ic('List', 36, 'discover-novel-fallback-icon')
                      ),
                      h('div', { className: 'discover-novel-info', style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
                          h('div', { className: 'discover-novel-title', style: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--paper)' } }, activeNovelView.title || 'Wattpad Playlist'),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: { fontSize: '11px', padding: '3px 8px', borderRadius: 999, color: 'var(--slate)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                            title: 'Start a new import or search',
                            onClick: () => {
                              setImportCategoryTab('wn');
                              handleResetImportTab();
                            }
                          }, ic('Plus', 12), 'New Import')
                        ),
                        h('div', { className: 'discover-novel-author', style: { fontSize: 13, color: 'var(--paper-dim)' } },
                          activeNovelView.author ? `Curated by ${activeNovelView.author}` : 'Wattpad Reading List'
                        ),
                        h('div', { className: 'discover-novel-stats', style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                          h('span', { className: 'badge', style: { background: '#ec4899', color: '#fff', fontWeight: 600 } }, `${activeNovelView.stories?.length || activeNovelView.totalCount || 0} Stories`),
                          h('span', { className: 'chip' }, 'Wattpad Reading List')
                        ),
                        h('div', { className: 'book-acts', style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            style: {
                              background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                              color: '#fff',
                              fontWeight: 700,
                              border: 'none',
                              boxShadow: '0 2px 10px rgba(236, 72, 153, 0.35)',
                              padding: '9px 16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: 'pointer'
                            },
                            title: 'Download all stories in this playlist as clean EPUBs directly to your device and library',
                            onClick: () => {
                              if (typeof handleMassDownloadPlaylist === 'function') {
                                handleMassDownloadPlaylist(activeNovelView);
                              } else {
                                toast('Mass download handler not available.', 'error');
                              }
                            }
                          }, ic('Download', 14), `Mass Download All EPUBs (${activeNovelView.stories?.length || activeNovelView.totalCount || 0})`),
                          (() => {
                            const fOpts = getNovelFolderOptions(activeNovelView);
                            const dispPath = activeNovelView.folderPath || fOpts.folderPath || '';
                            return h('button', {
                              type: 'button',
                              className: 'mini-btn secondary',
                              style: { display: 'inline-flex', alignItems: 'center', gap: 6 },
                              title: 'Set designated folder on device for EPUB downloads',
                              onClick: () => handleSetNovelFolder(activeNovelView)
                            }, ic('Folder', 13), (dispPath ? (dispPath.length > 22 ? dispPath.slice(0, 20) + '…' : dispPath) : 'Set Folder'));
                          })()
                        )
                      )
                    ),
                    Array.isArray(activeNovelView.stories) && activeNovelView.stories.length > 0 && h('div', {
                      style: { marginTop: 8 }
                    },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                        h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, `Stories in Playlist (${activeNovelView.stories.length})`),
                        h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Tap any story to import or download EPUB')
                      ),
                      h('div', {
                        style: {
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: 12
                        }
                      },
                        activeNovelView.stories.map((story, sIdx) => h('div', {
                          key: story.id || story.url || sIdx,
                          className: 'stu-story-row',
                          style: {
                            display: 'flex',
                            gap: 12,
                            padding: '12px 6px',
                            background: 'transparent',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            alignItems: 'center'
                          }
                        },
                          h('div', {
                            style: {
                              width: 48,
                              height: 68,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: 'rgba(0,0,0,0.2)'
                            }
                          },
                            story.cover
                              ? h('img', { src: story.cover, alt: story.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })
                              : ic('BookOpen', 24)
                          ),
                          h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 } },
                            h('div', {
                              style: {
                                fontWeight: 600,
                                fontSize: 13,
                                color: 'var(--paper)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              },
                              title: story.title
                            }, story.title),
                            h('div', { style: { fontSize: 11, color: 'var(--paper-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              story.author ? `By ${story.author}` : ''
                            ),
                            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 } },
                              h('span', { className: 'chip', style: { fontSize: 10, padding: '1px 6px' } }, `${story.chapters || story.chapterCount || story.parts || 0} Ch`),
                              story.completed && h('span', { className: 'chip', style: { fontSize: 10, padding: '1px 6px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' } }, 'Completed')
                            ),
                            h('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
                              h('button', {
                                type: 'button',
                                className: 'mini-btn secondary',
                                style: { fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 },
                                title: 'Load into importer to inspect chapters or read',
                                onClick: () => {
                                  setWebImportUrl(story.url);
                                  handleStartFetch(false, null, false, story.url);
                                }
                              }, ic('BookOpen', 11), 'Open'),
                              h('button', {
                                type: 'button',
                                className: 'mini-btn ghost',
                                style: { fontSize: 11, padding: '3px 8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                                title: 'Download this story as a clean EPUB',
                                onClick: () => {
                                  if (typeof handleMassDownloadPlaylist === 'function') {
                                    handleMassDownloadPlaylist({ title: story.title, stories: [story] });
                                  } else {
                                    setWebImportUrl(story.url);
                                    handleStartFetch(false, null, false, story.url);
                                  }
                                }
                              }, ic('Download', 11), 'EPUB')
                            )
                          )
                        ))
                      )
                    )
                  )
                ) : activeNovelView.isUserLists ? (
                  h('div', { className: 'user-lists-view-container', style: { display: 'flex', flexDirection: 'column', gap: 14 } },
                    h('div', {
                      className: 'discover-novel-hero',
                      style: {
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                        borderRadius: 12,
                        padding: 16
                      }
                    },
                      h('div', { className: 'discover-novel-cover', style: { width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.15)' } },
                        ic('User', 36)
                      ),
                      h('div', { className: 'discover-novel-info', style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
                          h('div', { className: 'discover-novel-title', style: { margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--paper)' } }, `${activeNovelView.username || 'User'}'s Reading Lists`),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: { fontSize: '11px', padding: '3px 8px', borderRadius: 999, color: 'var(--slate)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                            title: 'Start a new import or search',
                            onClick: () => {
                              setImportCategoryTab('wn');
                              handleResetImportTab();
                            }
                          }, ic('Plus', 12), 'New Import')
                        ),
                        h('div', { className: 'discover-novel-stats', style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                          h('span', { className: 'badge', style: { background: '#8b5cf6', color: '#fff', fontWeight: 600 } }, `${activeNovelView.lists?.length || activeNovelView.totalCount || 0} Reading Lists`),
                          h('span', { className: 'chip' }, 'Wattpad Profile')
                        )
                      )
                    ),
                    Array.isArray(activeNovelView.lists) && activeNovelView.lists.length > 0 && h('div', {
                      style: { marginTop: 8 }
                    },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                        h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)' } }, `Reading Lists (${activeNovelView.lists.length})`),
                        h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, 'Select a reading list to open or mass download')
                      ),
                      h('div', {
                        style: {
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: 12
                        }
                      },
                        activeNovelView.lists.map((list, lIdx) => h('div', {
                          key: list.id || lIdx,
                          className: 'stu-story-row',
                          style: {
                            display: 'flex',
                            gap: 12,
                            padding: '12px 6px',
                            background: 'transparent',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            alignItems: 'center'
                          }
                        },
                          h('div', {
                            style: {
                              width: 48,
                              height: 68,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              background: 'rgba(0,0,0,0.2)'
                            }
                          },
                            list.cover
                              ? h('img', { src: list.cover, alt: list.name, style: { width: '100%', height: '100%', objectFit: 'cover' } })
                              : ic('List', 24)
                          ),
                          h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
                            h('div', {
                              style: {
                                fontWeight: 600,
                                fontSize: 13,
                                color: 'var(--paper)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              },
                              title: list.name
                            }, list.name),
                            h('div', { style: { fontSize: 11, color: 'var(--paper-dim)' } },
                              `${list.numStories || 0} stories`
                            ),
                            h('div', { style: { display: 'flex', gap: 6, marginTop: 4 } },
                              h('button', {
                                type: 'button',
                                className: 'mini-btn secondary',
                                style: { fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 },
                                title: 'Open this reading list',
                                onClick: () => {
                                  setWebImportUrl(list.url);
                                  handleStartFetch(false, null, false, list.url);
                                }
                              }, ic('BookOpen', 11), 'Open List'),
                              h('button', {
                                type: 'button',
                                className: 'mini-btn ghost',
                                style: { fontSize: 11, padding: '3px 8px', color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                                title: 'Mass download all stories in this reading list',
                                onClick: async () => {
                                  try {
                                    toast(`Fetching stories for "${list.name}"…`, 'info');
                                    const plugin = window.sourceRegistry?.getPlugin?.('wattpad');
                                    if (plugin && typeof plugin.getPlaylistDetails === 'function') {
                                      const pl = await plugin.getPlaylistDetails(list.url);
                                      if (pl && pl.stories && pl.stories.length > 0) {
                                        if (typeof handleMassDownloadPlaylist === 'function') {
                                          handleMassDownloadPlaylist(pl);
                                        }
                                      } else {
                                        toast('No stories found in list.', 'warning');
                                      }
                                    } else {
                                      setWebImportUrl(list.url);
                                      handleStartFetch(false, null, false, list.url);
                                    }
                                  } catch (err) {
                                    toast('Failed to load list stories: ' + err.message, 'error');
                                  }
                                }
                              }, ic('Download', 11), 'Mass EPUB')
                            )
                          )
                        ))
                      )
                    )
                  )
                ) : (
                  h('div', { className: 'discover-novel-hero' },
                  h('div', { className: 'discover-novel-cover' },
                    activeNovelView.cover
                      ? h('img', { src: activeNovelView.cover, alt: 'Cover' })
                      : ic('BookOpen', 32, 'discover-novel-fallback-icon')
                  ),
                  h('div', { className: 'discover-novel-info' },
                    h('div', null,
                      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 } },
                        h('div', { className: 'discover-novel-title', style: { margin: 0, flex: 1 } }, activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || 'Untitled Web Novel'),
                        h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn secondary',
                            style: { fontSize: '11px', padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
                            title: 'Rename this novel',
                            onClick: () => {
                              setRenameModalNovel(activeNovelView);
                              setNewNovelTitleInput(activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || '');
                            }
                          }, ic('Edit', 12), 'Rename'),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: { fontSize: '11px', padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--slate)', display: 'inline-flex', alignItems: 'center', gap: 4 },
                            title: 'Reset view and start a new import or search',
                            onClick: () => {
                              setImportCategoryTab('wn');
                              handleResetImportTab();
                            }
                          }, ic('Plus', 12), 'New Import')
                        )
                      ),
                      h('div', { className: 'discover-novel-author' }, `By ${activeNovelView.author || 'Unknown'}`),
                      h('div', { className: 'discover-novel-stats' },
                        h('span', { className: 'badge', style: { background: 'var(--accent, #6366f1)', color: '#fff' } }, `${getSafeChapterCount(activeNovelView)} chapters`),
                        h('span', { className: 'chip' }, `${getSafeChapters(activeNovelView).reduce((a, c) => a + (((c && (c.text || c.content)) || '').split(/\s+/).filter(Boolean).length), 0).toLocaleString()} words`),
                        isLnoriNovel && h('span', { className: 'chip', style: { color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' } }, 'English Original')
                      )
                    ),
                    h('div', { className: 'book-acts', style: { marginTop: 12 } },
                    isLnoriNovel && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: {
                        background: 'linear-gradient(90deg, #6366f1, #10b981)',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                        padding: '9px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      },
                      title: 'Directly download clean English EPUB with full illustrations, volume hierarchy, and cover art',
                      onClick: () => exportCleanLnoriEpub(activeNovelView)
                    }, ic('Zap', 13), `Download Clean Lnori EPUB (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', {

                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters available to read.', 'warning');
                        const isTrans = !!full?.isTranslated || !!activeNovelView?.isTranslated;
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
                        if (typeof setReaderChapters === 'function') {
                          setReaderChapters(mappedChs);
                        }
                        if (typeof setActiveNovelRecord === 'function') {
                          setActiveNovelRecord(full);
                        }
                        const novelKey = full?.id || activeNovelView?.id || activeNovelView?.title || 'web_import_novel';
                        setReaderNovelId(novelKey);
                        setReaderNovelTitle(full?.title || activeNovelView?.title || 'Web Novel');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${full?.title || activeNovelView?.title || 'Novel'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        } else {
                          toast(`Reading "${full?.title || activeNovelView?.title || 'Novel'}" (${chs.length} ch)!`, 'success');
                        }
                      }
                    }, ic('BookOpen', 13), `Read (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', { type: 'button', className: 'mini-btn', onClick: async () => {
                      const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                      const chs = getSafeChapters(full);
                      const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                      setInputText(fullText);
                      setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                      setAssembledText('');
                      setTranslatedChapters([]);
                      setActiveNovelRecord(full || activeNovelView);
                      setCurrentDocCover(full?.cover || activeNovelView?.cover || '');
                      setFileName(full?.title || activeNovelView.title || 'Web Novel');
                      setCurrentDocTitle(full?.title || activeNovelView.title || 'Web Novel');
                      checkAndApplyNovelGlossary(full || activeNovelView);
                      setActiveTab('text');
                      toast(`Loaded "${full?.title || activeNovelView.title || 'Novel'}" (${chs.length} ch) to Translator! Tap "Translate" below to begin translating.`, 'info');
                    } }, isLnoriNovel ? 'Translate to Other Lang' : 'Send to Translator'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      title: 'Pre-scan chapters with AI to extract characters, genders, and lore terms into a Smart Glossary',
                      onClick: () => handleOpenAutoGlossary(activeNovelView)
                    }, ic('Sparkles', 13), 'Auto-Build Glossary'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: activeNovelView.inSavedSpace ? '#f59e0b' : 'var(--hairline)', color: activeNovelView.inSavedSpace ? '#f59e0b' : 'var(--paper)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: async () => {
                        await toggleNovelSavedSpace(activeNovelView.id, activeNovelView);
                      }
                    }, ic('Star', 13), (activeNovelView.inSavedSpace ? 'In Saved Space' : 'Save to Space')),
                    (() => {
                      const fOpts = getNovelFolderOptions(activeNovelView);
                      const dispPath = activeNovelView.folderPath || fOpts.folderPath || '';
                      const hasFolder = !!(dispPath || activeNovelView.folderTreeUri || fOpts.treeUri);
                      return h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: {
                          borderColor: hasFolder ? '#10b981' : 'var(--hairline)',
                          color: hasFolder ? '#10b981' : 'var(--paper)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        },
                        title: 'Set designated folder on device for Moon+ Reader continuity',
                        onClick: () => handleSetNovelFolder(activeNovelView)
                      }, ic('Folder', 13), (dispPath ? (dispPath.length > 22 ? dispPath.slice(0, 20) + '…' : dispPath) : 'Set Folder'));
                    })(),
                    !isLnoriNovel && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 },
                      onClick: async () => {
                        try {
                          const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                          const chs = getSafeChapters(full).length > 0 ? getSafeChapters(full) : getSafeChapters(activeNovelView);
                          if (!chs.length) return toast('No chapters available to download.', 'warning');
                          const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(activeNovelView.title, chs) : (activeNovelView.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                          const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(activeNovelView.author) : (activeNovelView.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                          const isInc = activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                          if (full && full.epubBlob && !full.isEdited && !activeNovelView?.isEdited) {
                            const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                            await saveUniversalBlob(full.epubBlob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeNovelView || full));
                            toast(`EPUB downloaded successfully! (${chs.length} chapters)`, 'success');
                            return;
                          }
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: activeNovelView?.id || activeNovelView?.sourceUrl || novelTitle, coverUrl: activeNovelView?.cover || '' }) : { coverUrl: activeNovelView?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeNovelView));
                          toast(`EPUB downloaded successfully! (${chs.length} chapters)`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, ic('Download', 13), (activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && getSafeChapterCount(activeNovelView) < activeNovelView.totalChapterCount))
                      ? `Download EPUB (${getSafeChapterCount(activeNovelView)} Ch — Incomplete)`
                      : `Download EPUB (${getSafeChapterCount(activeNovelView)} Ch)`)
                  )
                )
              ))),
                activeNovelView && getSafeChapters(activeNovelView).length > 0 && (() => {
                  const sortedChs = [...getSafeChapters(activeNovelView)].sort((a, b) => (a && b && a.idx !== undefined && b.idx !== undefined) ? (a.idx - b.idx) : 0);
                  const chs = sortedChs;
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

                    // Clean any dangling punctuation (commas, dashes, colons) from title
                    cleanTitle = (cleanTitle || title).replace(/^[\s:–—,.-]+/, '').trim() || title;

                    const effectiveVolName = volName || (groupMap.size === 0 ? 'Prologue / General' : 'Extra / Other');
                    const volKey = volName ? `vol_${volName.replace(/\s+/g, '_')}` : `group_${effectiveVolName.replace(/\s+/g, '_')}`;

                    let targetGroup = groupMap.get(volKey);
                    if (!targetGroup) {
                      targetGroup = {
                        volKey,
                        volName: effectiveVolName,
                        hasRealVolume: Boolean(volName),
                        items: []
                      };
                      groupMap.set(volKey, targetGroup);
                      volumeGroups.push(targetGroup);
                    }

                    targetGroup.items.push({
                      chapter: ch,
                      globalIdx,
                      cleanTitle: cleanTitle || title,
                      fullTitle: title
                    });
                  });

                  const distinctNamedVolumes = volumeGroups.filter(g => g.hasRealVolume);
                  const isMultiVolume = (distinctNamedVolumes.length >= 2 || (volumeGroups.length >= 2 && distinctNamedVolumes.length >= 1)) && !isFlatChapterView;

                  const isVolCollapsed = (volKey, idx) => {
                    if (collapsedVolumes[volKey] !== undefined) return collapsedVolumes[volKey];
                    return idx > 0; // First volume open by default, remaining volumes collapsed
                  };

                  const areAllCollapsed = volumeGroups.every((g, idx) => isVolCollapsed(g.volKey, idx));

                  const toggleExpandAllVolumes = () => {
                    const targetCollapse = !areAllCollapsed;
                    const next = {};
                    volumeGroups.forEach(g => {
                      next[g.volKey] = targetCollapse;
                    });
                    setCollapsedVolumes(next);
                  };

                  return h('div', { className: 'stu-chapter-ingestion-stage' },
                    h('div', { className: 'card-title', style: { flexWrap: 'wrap', gap: '8px' } },
                      h('span', null, isMultiVolume ? `Chapters (${chs.length} in ${distinctNamedVolumes.length || volumeGroups.length} Volumes)` : `Chapters (${chs.length})`),
                      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                        (distinctNamedVolumes.length >= 2 || volumeGroups.length >= 2) && h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: isFlatChapterView ? 'Group chapters into volume and arc sections' : 'Display chapters as a single continuous flat list',
                          onClick: () => {
                            setIsFlatChapterView(prev => {
                              const next = !prev;
                              try { localStorage.setItem('gemini_flat_chapter_view', String(next)); } catch (_) {}
                              return next;
                            });
                          }
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, ic(isFlatChapterView ? 'Layers' : 'List', 13), isFlatChapterView ? 'Group by Arcs' : 'Flat List')),
                        isMultiVolume && h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: areAllCollapsed ? 'Expand all volumes' : 'Collapse all volumes',
                          onClick: toggleExpandAllVolumes
                        }, areAllCollapsed ? 'Expand All' : 'Collapse All'),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Auto-sort chapters chronologically by number (Prologue to Ch 1 to Ch N)',
                          onClick: autoSortImportChapters
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('ArrowUpDown', 14), 'Auto-Sort')),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Use AI to analyze and order chapters into canonical reading sequence',
                          disabled: isAiSorting,
                          onClick: aiReorderImportChapters
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Sparkles', 14), isAiSorting ? 'Sorting…' : 'AI Sort')),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Reverse entire chapter order',
                          onClick: reverseImportChapters
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('ArrowUpDown', 14), 'Reverse'))
                      )
                    ),
                    h('div', { className: 'custom-scrollbar', style: { maxHeight: 420, overflowY: 'auto' } },
                      isMultiVolume
                        ? volumeGroups.map((vol, vIdx) => {
                            const collapsed = isVolCollapsed(vol.volKey, vIdx);
                            const volWords = vol.items.reduce((acc, it) => acc + ((it.chapter?.text || it.chapter?.content || '').split(/\s+/).filter(Boolean).length), 0);
                            return h('div', { key: vol.volKey || vIdx, style: { marginBottom: '8px' } },
                              h('div', {
                                className: 'toc-vol-hdr',
                                onClick: () => {
                                  setCollapsedVolumes(prev => ({
                                    ...prev,
                                    [vol.volKey]: !collapsed
                                  }));
                                }
                              },
                                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                                  h('span', { className: 'toc-vol-chevron' }, collapsed ? '▸' : '▾'),
                                  h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 } }, ic('Folder', 15), vol.volName),
                                  h('span', { className: 'toc-vol-count' }, `${vol.items.length} ch · ${volWords.toLocaleString()}w`)
                                ),
                                h('span', { style: { fontSize: '11px', color: 'var(--slate)', cursor: 'pointer' } }, collapsed ? 'Expand' : 'Collapse')
                              ),
                              !collapsed && h('div', { style: { paddingLeft: '8px', borderLeft: '2px solid rgba(255, 180, 84, 0.25)', marginLeft: '6px', marginTop: '2px' } },
                                vol.items.map(it => {
                                  const i = it.globalIdx;
                                  const c = it.chapter;
                                  return h('div', { key: i, className: 'set-row', style: { alignItems: 'center', gap: '10px', padding: '7px 0' } },
                                    h('span', {
                                      className: 'l',
                                      title: c?.title || '',
                                      style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, fontSize: '13.5px' }
                                    }, `${i + 1}. ${it.cleanTitle || c?.title || `Chapter ${i + 1}`}`),
                                    h('div', { className: 'pane-acts', style: { flexWrap: 'nowrap', flexShrink: 0, gap: '4px' } },
                                      h('span', { className: 'count', style: { marginRight: '4px' } }, `${((c?.text || c?.content || '').split(/\s+/).filter(Boolean).length).toLocaleString()}w`),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move to Top (Start)', disabled: i === 0, onClick: () => moveImportChapterToEdge(i, 'top') }, ic('ChevronsUp', 12)),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move Up 1', disabled: i === 0, onClick: () => moveImportChapter(i, -1) }, ic('ChevronUp', 12)),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move Down 1', disabled: i >= chs.length - 1, onClick: () => moveImportChapter(i, 1) }, ic('ChevronDown', 12)),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move to Bottom (End)', disabled: i >= chs.length - 1, onClick: () => moveImportChapterToEdge(i, 'bottom') }, ic('ChevronsDown', 12)),
                                      h('button', { type: 'button', className: 'ch-btn danger', title: 'Remove Chapter', onClick: () => removeImportChapter(i) }, ic('X', 12))
                                    )
                                  );
                                })
                              )
                            );
                          })
                        : chs.map((c, i) => h('div', { key: i, className: 'set-row', style: { alignItems: 'center', gap: '10px', padding: '8px 0' } },
                            h('span', { className: 'l', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, fontSize: '13.5px' } }, `${i + 1}. ${c?.title || `Chapter ${i + 1}`}`),
                            h('div', { className: 'pane-acts', style: { flexWrap: 'nowrap', flexShrink: 0, gap: '4px' } },
                              h('span', { className: 'count', style: { marginRight: '4px' } }, `${((c.text || c.content || '').split(/\s+/).filter(Boolean).length).toLocaleString()}w`),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move to Top (Start)', disabled: i === 0, onClick: () => moveImportChapterToEdge(i, 'top') }, ic('ChevronsUp', 12)),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move Up 1', disabled: i === 0, onClick: () => moveImportChapter(i, -1) }, ic('ChevronUp', 12)),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move Down 1', disabled: i >= chs.length - 1, onClick: () => moveImportChapter(i, 1) }, ic('ChevronDown', 12)),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move to Bottom (End)', disabled: i >= chs.length - 1, onClick: () => moveImportChapterToEdge(i, 'bottom') }, ic('ChevronsDown', 12)),
                              h('button', { type: 'button', className: 'ch-btn danger', title: 'Remove Chapter', onClick: () => removeImportChapter(i) }, ic('X', 12))
                            )
                          ))
                    )
                  );
                })(),

                h('div', { className: 'note-row' },
                  h('span', null, 'Scrape images with chapters'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { className: 'hint' }, 'saved with the book'),
                    h('button', {
                      type: 'button',
                      className: `switch ${scrapeImages ? 'on' : ''}`,
                      title: 'Scrape illustrations alongside chapters',
                      onClick: () => {
                        const next = !scrapeImages;
                        setScrapeImages(next);
                        localStorage.setItem('scrapeImages', String(next));
                        if (typeof window !== 'undefined') window.__scrapeImages = next;
                        toast(next ? 'Image scraping enabled' : 'Image scraping disabled (text only)', 'info');
                      }
                    })
                  )
                ),
                h('div', { className: 'note-row' },
                  h('span', null, 'Embed images in EPUB'),
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { className: 'hint' }, epubIncludeImages ? 'illustrations included' : 'text-only export'),
                    h('button', {
                      type: 'button',
                      className: `switch ${epubIncludeImages ? 'on' : ''}`,
                      title: 'Toggle embedding illustrations into exported EPUB files',
                      onClick: () => {
                        const next = !epubIncludeImages;
                        setEpubIncludeImages(next);
                        localStorage.setItem('epubIncludeImages', String(next));
                        if (next && !scrapeImages) {
                          setScrapeImages(true);
                          localStorage.setItem('scrapeImages', 'true');
                          if (typeof window !== 'undefined') window.__scrapeImages = true;
                        }
                        toast(next ? 'Illustrations will be embedded in EPUB' : 'Images excluded from EPUB (text only)', 'info');
                      }
                    })
                  )
                ),
                h(InfoTooltip, {
                  title: 'Supported Sources',
                  text: 'Extracts full works and multi-chapter stories from NovelBuddy, Lnori, Wuxia Box, WTR-LAB, FUCKNOVELPIA, NovelBin, NovelFire, Pixiv, AO3, Syosetu, Lofter, Witch Cult Translations, and standard WordPress/Tumblr webnovels directly to EPUB.',
                  tip: 'Paste either a novel page URL or any chapter URL to fetch the entire story.'
                }),

                // Web Novel Search Results Grid / List
                novelSearchResults && novelSearchResults.length > 0 && h('div', {
                  style: {
                    margin: '14px 0 16px',
                    padding: activeNovelView ? '12px 14px' : undefined,
                    borderRadius: activeNovelView ? 8 : undefined,
                    background: activeNovelView ? 'rgba(255, 255, 255, 0.02)' : undefined,
                    border: activeNovelView ? '1px solid var(--hairline)' : undefined
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (activeNovelView && isSearchResultsCollapsed) ? 0 : 10, flexWrap: 'wrap', gap: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--paper)' } },
                      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('BookOpen', 15), 'Web Novel Search Results'),
                      h('span', { className: 'badge', style: { fontSize: 10.5, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent, #6366f1)' } }, `${novelSearchResults.length}`),
                      activeNovelView && h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 500 } }, '· Tap to switch novel')
                    ),
                    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
                      activeNovelView && h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { fontSize: 10.5, padding: '2px 8px', color: 'var(--iris)', borderColor: 'var(--iris)', fontWeight: 600 },
                        onClick: () => setIsSearchResultsCollapsed(!isSearchResultsCollapsed)
                      }, isSearchResultsCollapsed ? `▼ Show ${novelSearchResults.length} Results` : '▲ Hide Results'),
                      (!activeNovelView || !isSearchResultsCollapsed) && (() => {
                        const allSources = ['all', ...Array.from(new Set(novelSearchResults.map(n => n.source).filter(Boolean)))];
                        return allSources.map(f => {
                          const normF = (f || '').replace(/[\s\-_]+/g, '').toLowerCase();
                          const count = f === 'all' ? novelSearchResults.length : novelSearchResults.filter(n => (n.source || '').replace(/[\s\-_]+/g, '').toLowerCase() === normF).length;
                          if (f !== 'all' && count === 0) return null;
                          const isSel = (novelSearchFilter || 'all').replace(/[\s\-_]+/g, '').toLowerCase() === normF;
                          return h('button', {
                            key: f,
                            type: 'button',
                            className: `mini-btn ${isSel ? '' : 'ghost'}`,
                            style: {
                              fontSize: 10.5,
                              padding: '2px 8px',
                              fontWeight: isSel ? 700 : 500,
                              borderColor: isSel ? 'var(--accent, #6366f1)' : 'var(--hairline)',
                              background: isSel ? 'rgba(99, 102, 241, 0.15)' : undefined
                            },
                            onClick: () => setNovelSearchFilter(f)
                          }, `${f === 'all' ? 'All' : f} (${count})`);
                        });
                      })(),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { fontSize: 10.5, padding: '2px 8px', color: 'var(--slate)' },
                        onClick: () => setNovelSearchResults([])
                      }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('X', 12), 'Clear'))
                    )
                  ),
                  (!activeNovelView || !isSearchResultsCollapsed) && h('div', { className: 'discover-cover-grid' },
                    novelSearchResults
                      .filter(item => {
                        const f = (novelSearchFilter || 'all').replace(/[\s\-_]+/g, '').toLowerCase();
                        if (f === 'all') return true;
                        const s = (item.source || '').replace(/[\s\-_]+/g, '').toLowerCase();
                        return s === f;
                      })
                      .map((item, idx) => h('div', {
                        key: item.id || idx,
                        className: 'discover-grid-card',
                        onClick: () => {
                          setWebImportUrl(item.url);
                          if (item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url)) {
                            handleLnoriDirectEpubDownload(item.url);
                          } else {
                            setIsSearchResultsCollapsed(true);
                            handleStartFetch(false, null, false, item.url);
                          }
                        }
                      },
                        h('div', { className: 'discover-grid-cover-wrap' },
                          item.cover ? h('img', {
                            src: item.cover,
                            alt: item.title,
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
                              fontSize: 32
                            }
                          }, ic('BookOpen', 32, 'text-paper-dim')),
                          h('div', { className: 'discover-grid-spine-shadow' }),
                          item.source && h('span', {
                            className: 'discover-grid-source-badge',
                            style: {
                              background: item.source === 'NovelBuddy' ? 'rgba(16, 185, 129, 0.9)' : (item.source === 'RoyalRoad' ? 'rgba(59, 130, 246, 0.9)' : (item.source === 'Lnori' ? 'rgba(168, 85, 247, 0.9)' : (item.source === 'Wattpad' ? 'rgba(255, 97, 34, 0.95)' : 'rgba(236, 72, 153, 0.9)'))),
                              color: '#fff'
                            }
                          }, item.source)
                        ),
                        h('div', { className: 'discover-grid-title', title: item.title }, item.title),
                        h('div', { className: 'discover-grid-author' }, item.author ? `by ${item.author}` : (item.chapters ? `${item.chapters}` : '')),
                        h('div', { className: 'discover-grid-actions' },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            style: {
                              width: '100%',
                              justifyContent: 'center',
                              padding: '6px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: (item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url)) ? 'linear-gradient(90deg, #6366f1, #10b981)' : 'var(--accent, #6366f1)',
                              border: 'none',
                              color: '#fff',
                              borderRadius: 999
                            },
                            onClick: (e) => {
                              e.stopPropagation();
                              setWebImportUrl(item.url);
                              if (item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url)) {
                                handleLnoriDirectEpubDownload(item.url);
                              } else {
                                setIsSearchResultsCollapsed(true);
                                handleStartFetch(false, null, false, item.url);
                              }
                            }
                          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, (item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url)) ? [ic('Zap', 12), '1-Click EPUB'] : [ic('Download', 12), 'Fetch Novel']))
                        )
                      ))
                  )
                ),
                // SwiftAudiobooks Search Results Grid / List
                swiftAudioResults && swiftAudioResults.length > 0 && h('div', { style: { margin: '14px 0 16px' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--paper)' } },
                      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Headphones', 15), 'SwiftAudiobooks Results'),
                      h('span', { className: 'badge', style: { fontSize: 10.5, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent, #6366f1)' } }, `${swiftAudioResults.length}`)
                    ),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { fontSize: 10.5, padding: '2px 8px' },
                      onClick: () => setSwiftAudioResults([])
                    }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('X', 12), 'Clear'))
                  ),
                  h('div', { className: 'discover-cover-grid' },
                    swiftAudioResults.map((item, idx) => h('div', {
                      key: idx,
                      className: 'discover-grid-card',
                      onClick: () => handleStartPlayAudiobook(item)
                    },
                      h('div', { className: 'discover-grid-cover-wrap' },
                        item.cover ? h('img', {
                          src: item.cover,
                          alt: 'Cover',
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
                            fontSize: 32
                          }
                        }, ic('Headphones', 32, 'text-paper-dim')),
                        h('div', { className: 'discover-grid-spine-shadow' }),
                        h('span', {
                          className: 'discover-grid-source-badge',
                          style: { background: 'rgba(236, 72, 153, 0.9)', color: '#fff' }
                        }, item.duration || 'Audio')
                      ),
                      h('div', { className: 'discover-grid-title', title: item.title }, item.title),
                      h('div', { className: 'discover-grid-author' }, item.author ? `by ${item.author}` : 'SwiftAudio'),
                      h('div', { className: 'discover-grid-actions' },
                        h('button', {
                          type: 'button',
                          className: 'mini-btn',
                          style: {
                            width: '100%',
                            justifyContent: 'center',
                            padding: '6px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #6366f1, #ec4899)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 999
                          },
                          onClick: (e) => {
                            e.stopPropagation();
                            handleStartPlayAudiobook(item);
                          }
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('Headphones', 13), 'Listen Now'))
                      )
                    ))
                  )
                ),

                // Ebook & Published Book Search Results Grid / List
                bookSearchResults && bookSearchResults.length > 0 && (() => {
                  const displayedBooks = (bookSearchResults || []).filter(item => {
                    if (!booksDownloadableOnly) return true;
                    return Boolean(item.directEpub || item.epubUrl || item.downloadUrl);
                  });

                  return h('div', { style: { margin: '14px 0 16px' } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--paper)' } },
                        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, ic('BookOpen', 15), 'Book Search Results'),
                        h('span', { className: 'badge', style: { fontSize: 10.5, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } }, `${displayedBooks.length}`),
                        bookSearchResults.length !== displayedBooks.length ? h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 500 } }, `(${bookSearchResults.length} total)`) : null
                      ),
                      h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                        h('label', {
                          style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: booksDownloadableOnly ? '#10b981' : 'var(--slate)',
                            background: booksDownloadableOnly ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: `1px solid ${booksDownloadableOnly ? 'rgba(16, 185, 129, 0.3)' : 'var(--hairline)'}`
                          }
                        },
                          h('input', {
                            type: 'checkbox',
                            checked: booksDownloadableOnly,
                            onChange: (e) => setBooksDownloadableOnly(e.target.checked),
                            style: { cursor: 'pointer', accentColor: '#10b981' }
                          }),
                          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('Zap', 12), 'Direct Downloads Only')
                        ),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 10.5, padding: '2px 8px' },
                          onClick: () => setBookSearchResults([])
                        }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, ic('X', 12), 'Clear'))
                      )
                    ),
                    displayedBooks.length === 0 ? h('div', {
                      style: {
                        padding: '16px',
                        textAlign: 'center',
                        color: 'var(--paper-dim)',
                        background: 'var(--card-bg)',
                        border: '1px dashed var(--hairline)',
                        borderRadius: 12,
                        fontSize: 12
                      }
                    },
                      'No direct download files found with filter active. ',
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { fontSize: 11, marginLeft: 6, color: 'var(--iris)' },
                        onClick: () => setBooksDownloadableOnly(false)
                      }, 'Show all catalog records')
                    ) : h('div', { className: 'discover-cover-grid' },
                      displayedBooks.map((item, idx) => {
                        const isEpub = item.format === 'EPUB' || (item.formatBadge && item.formatBadge.includes('EPUB'));
                        const isPdf = item.format === 'PDF' || (item.formatBadge && item.formatBadge.includes('PDF'));
                        return h('div', {
                          key: item.id || idx,
                          className: 'discover-grid-card',
                          onClick: () => {
                            if (isEpub || item.directEpub || item.epubUrl) {
                              handleDownloadBookEpub(item);
                            } else if (item.downloadUrl) {
                              (window.BookSearchEngine?.openExternalUrl || window.open)(item.downloadUrl, '_blank');
                            } else if (item.iaUrl || item.annasUrl || item.workUrl) {
                              window.open(item.iaUrl || item.annasUrl || item.workUrl, '_blank');
                            }
                          }
                        },
                          h('div', { className: 'discover-grid-cover-wrap' },
                            item.cover ? h('img', {
                              src: item.cover,
                              alt: item.title,
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
                                fontSize: 32
                              }
                            }, ic(isPdf ? 'FileText' : 'Library', 32, 'text-paper-dim')),
                            h('div', { className: 'discover-grid-spine-shadow' }),
                            h('span', {
                              className: 'discover-grid-source-badge',
                              style: {
                                background: isEpub ? 'rgba(16, 185, 129, 0.9)' : (isPdf ? 'rgba(245, 158, 11, 0.9)' : 'rgba(99, 102, 241, 0.9)'),
                                color: '#fff'
                              }
                            }, item.sourceBadge || (isEpub ? 'EPUB' : (isPdf ? 'PDF' : 'BOOK')))
                          ),
                          h('div', { className: 'discover-grid-title', title: item.title }, item.title),
                          h('div', { className: 'discover-grid-author' }, item.authors ? `by ${item.authors}` : (item.source || '')),
                          h('div', { className: 'discover-grid-actions' },
                            h('button', {
                              type: 'button',
                              className: 'mini-btn',
                              style: {
                                width: '100%',
                                justifyContent: 'center',
                                padding: '6px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isEpub ? 'linear-gradient(90deg, #10b981, #059669)' : 'var(--accent, #6366f1)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: 999
                              },
                              onClick: (e) => {
                                e.stopPropagation();
                                if (isEpub || item.directEpub || item.epubUrl) {
                                  handleDownloadBookEpub(item);
                                } else if (item.downloadUrl) {
                                  (window.BookSearchEngine?.openExternalUrl || window.open)(item.downloadUrl, '_blank');
                                } else if (item.iaUrl || item.annasUrl || item.workUrl) {
                                  window.open(item.iaUrl || item.annasUrl || item.workUrl, '_blank');
                                }
                              }
                            }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, isEpub ? [ic('Download', 13), 'Download EPUB'] : (isPdf ? [ic('FileText', 13), 'Get PDF'] : [ic('BookOpen', 13), 'Get Book'])))
                          )
                        );
                      })
                    )
                  );
                })(),

                sourcesModalOpen && h(SourcesInfoModal, {
                  isOpen: sourcesModalOpen,
                  onClose: () => setSourcesModalOpen(false)
                }),

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
