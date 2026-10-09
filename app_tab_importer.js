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
            h('span', { style: { fontSize: 18 } }, 'ℹ️'),
            h('span', { style: { fontWeight: 700, fontSize: 15, color: 'var(--paper)' } }, 'Supported Built-in Sources & Formats')
          ),
          h('button', {
            type: 'button',
            className: 'icon-btn',
            style: { cursor: 'pointer', padding: '4px 8px', borderRadius: 6 },
            onClick: onClose
          }, '✕')
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
              '📖 Light Novels (LNs)'
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
              '🌐 Web Novels (WNs)'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Built-in parsers for leading serialization platforms, fan archives, and aggregators.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Built-in Crawlers: '), 'NovelBuddy, NovelFire, RoyalRoad, NovelBin, ReadNovelFull, ScribbleHub.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Special Curated Archives: '), 'Witch Cult Translations (full chapter archive with live table-of-contents auto-update checking).'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Community & Fanfic: '), 'Archive of Our Own (AO3), Pixiv (series & novels), Syosetu (Shousetsuka ni Narou), Kakuyomu.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Extensible Source Plugins: '), 'Install and run any of 278+ community source plugins with custom domain routing.')
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
              '🎧 Audiobooks'
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
              '📚 Books & Published Literature'
            ),
            h('p', { style: { color: 'var(--paper-dim)', margin: '0 0 6px 0' } },
              'Multi-catalog search covering millions of public domain masterpieces, textbooks, and free digital editions.'
            ),
            h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--slate)' } },
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Project Gutenberg: '), '70,000+ public domain literary classics with direct EPUB downloads.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Standard Ebooks: '), 'Carefully typeset, beautifully formatted public domain editions with rich typography.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Library Genesis (LibGen): '), 'Direct mirrors for millions of fiction, non-fiction, and academic books.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, 'Open Library & Internet Archive: '), 'Universal catalog records and borrowable digital texts.'),
              h('li', null, h('strong', { style: { color: 'var(--paper)' } }, '1-Tap External Mirrors: '), 'Direct query shortcuts to Anna\'s Archive and OceanOfPDF.')
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
            h('div', { style: { fontWeight: 600, color: 'var(--paper)', marginBottom: 4 } }, '💡 Zero-Login & Direct Links:'),
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
    const [booksDownloadableOnly, setBooksDownloadableOnly] = useState(true);
    const [isScoutingUrl, setIsScoutingUrl] = useState(false);
    const [scoutStatusText, setScoutStatusText] = useState('');
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
                      toast?.(`✨ Site scouted & recipe saved (${res.stats.chaptersCount} chapters)! Loading chapters...`, 'success');
                      setTimeout(() => {
                        handleStartFetch(false);
                      }, 600);
                    } else {
                      toast?.(`✓ Recipe saved, but only ${res.stats?.chaptersCount || 0} chapter(s) detected. Please check the chapter link in Site Settings before fetching.`, 'warning');
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
                  className: 'card',
                  style: {
                    background: webImportError.isCloudflare ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    borderColor: webImportError.isCloudflare ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                    marginBottom: 12,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontSize: 13 } }, webImportError.isCloudflare ? '🛡️' : '⚠️'),
                      h('span', { style: { fontSize: 12, fontWeight: 700, color: webImportError.isCloudflare ? '#f87171' : '#fbbf24' } },
                        webImportError.isCloudflare ? 'Cloudflare Security Challenge Detected' : 'Crawl Paused to Protect Data'
                      )
                    ),
                    h('button', {
                      type: 'button',
                      style: { background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' },
                      onClick: () => setWebImportError(null)
                    }, '✕')
                  ),
                  h('div', { style: { fontSize: 11.5, color: 'var(--paper)', lineHeight: 1.45, marginBottom: 8 } },
                    webImportError.message || (webImportError.isCloudflare ? 'The remote novel website has active Turnstile human verification or anti-bot rate limits.' : 'Crawl paused due to consecutive connection failures.')
                  ),
                  webImportError.partialCount > 0 && h('div', { style: { fontSize: 11, color: '#34d399', marginBottom: 8, fontWeight: 600 } },
                    `✨ ${webImportError.partialCount} chapter(s) were safely saved to your Library before the pause.`
                  ),
                  h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600, padding: '8px 16px', borderRadius: 999 },
                      onClick: () => {
                        setWebImportError(null);
                        handleStartFetch(true);
                      }
                    }, '▶ Resume Fetch'),
                    webImportError.targetUrl && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: webImportError.isCloudflare ? 'rgba(234, 179, 8, 0.6)' : 'rgba(56, 189, 248, 0.4)', color: webImportError.isCloudflare ? '#facc15' : '#38bdf8', fontWeight: 600, padding: '8px 16px', borderRadius: 999 },
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
                    }, webImportError.isCloudflare ? '🛡️ Solve Captcha (In-App Browser)' : '🌐 Open Source in Browser'),
                    (webImportError.targetUrl || webImportUrl) && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 999 },
                      disabled: isScoutingUrl,
                      onClick: handleAutoScoutSite
                    }, isScoutingUrl ? '🧭 Scouting...' : '✨ Auto-Scout & Learn Site'),
                    (webImportError.targetUrl || webImportUrl) && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(234, 179, 8, 0.5)', color: '#eab308', fontWeight: 600, padding: '8px 16px', borderRadius: 999 },
                      onClick: () => {
                        const targetUrl = webImportError.targetUrl || webImportUrl;
                        if (typeof openSiteRecipeEditor === 'function') {
                          openSiteRecipeEditor({ url: targetUrl });
                        } else if (typeof window !== 'undefined' && window.SiteRecipeEngine?.Controller?.open) {
                          window.SiteRecipeEngine.Controller.open({ url: targetUrl });
                        }
                      }
                    }, '🛠️ Set up this site manually'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '8px 16px', borderRadius: 999, color: 'var(--slate)' },
                      onClick: () => {
                        setActiveTab('text');
                        toast('Switched to Translate tab: paste text or upload EPUB directly.', 'info');
                      }
                    }, '📋 Tab 1 / Upload EPUB')
                  )
                ),
                // Incomplete Crawl Session Banner (only shown when returning to tab, suppressed when actively paused in card)
                activeCrawlSession && !isFetchingPaused && !isFetchingUrl && h('div', {
                  className: 'card',
                  style: {
                    background: 'rgba(234, 179, 8, 0.08)',
                    borderColor: 'rgba(234, 179, 8, 0.3)',
                    marginBottom: 12,
                    padding: '12px 14px'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { fontSize: 12, fontWeight: 600, color: '#eab308' } }, '⏸ Incomplete Crawl Session Detected'),
                    h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, `${getSafeChapterCount(activeCrawlSession)} / ${activeCrawlSession.totalChapterCount || '?'} chapters`)
                  ),
                  h('div', { style: { fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--paper)' } }, activeCrawlSession.title || 'Untitled Web Novel'),
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff' },
                      disabled: isFetchingUrl,
                      onClick: () => handleStartFetch(true)
                    }, '▶ Resume Fetch'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600 },
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
                    }, `📥 Download EPUB (${getSafeChapterCount(activeCrawlSession)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700 },
                      onClick: () => {
                        const chs = getSafeChapters(activeCrawlSession);
                        if (chs.length === 0) return toast('No chapters downloaded yet to read.', 'warning');
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setTranslatedChapters([]);
                        setAssembledText('');
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
                    }, `📖 Read (${getSafeChapterCount(activeCrawlSession)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      onClick: () => {
                        const chs = getSafeChapters(activeCrawlSession);
                        const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                        setInputText(fullText);
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setActiveNovelRecord(activeCrawlSession);
                        setCurrentDocCover(activeCrawlSession?.cover || '');
                        setFileName(activeCrawlSession?.title || 'Web Novel');
                        setCurrentDocTitle(activeCrawlSession?.title || 'Web Novel');
                        setActiveTab('text');
                        toast(`Loaded ${chs.length} chapters to Translator tab!`, 'info');
                      }
                    }, 'Send to Translator'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      disabled: isFetchingUrl,
                      onClick: dismissCrawlSession
                    }, '✕ Dismiss')
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
                  h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
                    [
                      { id: 'ln', label: '📖 Light Novels' },
                      { id: 'wn', label: '🌐 Web Novels' },
                      { id: 'audio', label: '🎧 Audiobooks' },
                      { id: 'books', label: '📚 Books' }
                    ].map(tab => {
                      const isActive = importCategoryTab === tab.id;
                      return h('button', {
                        key: tab.id,
                        type: 'button',
                        className: `tab-btn ${isActive ? 'active' : ''}`,
                        style: {
                          padding: '6px 14px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          border: isActive ? '1px solid var(--accent, #6366f1)' : '1px solid var(--hairline)',
                          background: isActive ? 'var(--accent, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                          color: isActive ? '#ffffff' : 'var(--paper-dim)',
                          boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        },
                        onClick: () => {
                          setImportCategoryTab(tab.id);
                          const q = (webImportUrl || '').trim();
                          const isDirectUrl = /^https?:\/\//i.test(q);

                          if (tab.id === 'ln') {
                            setIsBookSearchMode(false);
                            setIsSwiftAudioMode(false);
                            setNovelSearchFilter('Lnori');
                            if (q && !isDirectUrl) {
                              handleSearchNovels(q, 'Lnori');
                            } else if (!q) {
                              toast('📖 Light Novels mode active. Type a title to search.', 'info');
                            }
                          } else if (tab.id === 'wn') {
                            setIsBookSearchMode(false);
                            setIsSwiftAudioMode(false);
                            setNovelSearchFilter('all');
                            if (q && !isDirectUrl) {
                              handleSearchNovels(q, 'all');
                            } else if (!q) {
                              toast('🌐 Web Novels mode active. Type a title or paste a novel link.', 'info');
                            }
                          } else if (tab.id === 'audio') {
                            setIsBookSearchMode(false);
                            setIsSwiftAudioMode(true);
                            setNovelSearchFilter('all');
                            if (q && !isDirectUrl) {
                              handleSwiftAudioSearch(q);
                            } else if (!q) {
                              toast('🎧 Audiobooks mode active. Type an audiobook title or paste link.', 'info');
                            }
                          } else if (tab.id === 'books') {
                            setIsBookSearchMode(true);
                            setIsSwiftAudioMode(false);
                            setNovelSearchFilter('all');
                            if (q && !isDirectUrl) {
                              handleSearchBooks(q);
                            } else if (!q) {
                              toast('📚 Books mode active. Type any book title or author to search.', 'info');
                            }
                          }
                        }
                      }, tab.label);
                    })
                  ),
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
                    }, '⚡ Continue EPUB'),
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
                        gap: 4,
                        cursor: 'pointer',
                        color: 'var(--paper-dim)',
                        border: '1px solid var(--hairline)'
                      },
                      onClick: () => setSourcesModalOpen(true),
                      title: 'View all supported built-in websites, formats, and plugins'
                    }, 'ℹ️ Sources'),
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
                        gap: 4,
                        cursor: 'pointer',
                        color: 'var(--iris)',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      },
                      onClick: handleOpenSourcePluginsModal,
                      title: 'Manage built-in source plugins and browse 278 LNReader community plugins'
                    }, '🔌 Plugins'),
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
                        gap: 4,
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
                    }, (webImportUrl && typeof window !== 'undefined' && window.SiteRecipeEngine?.findForUrl(webImportUrl)) ? '⚙️ Site settings ✓' : '⚙️ Site settings'),
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
                        gap: 4,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                      },
                      disabled: isScoutingUrl,
                      onClick: handleAutoScoutSite,
                      title: 'Autonomously scout, learn, and save extraction rules for this website'
                    }, isScoutingUrl ? '🧭 Scouting...' : '✨ 1-Tap Auto-Scout'),
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
                        gap: 4,
                        cursor: 'pointer',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)'
                      },
                      onClick: () => {
                        setImportCategoryTab('wn');
                        handleResetImportTab();
                      },
                      title: 'Reset Web Importer tab to clean state'
                    }, '✕ Reset Tab')
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
                  h('span', { className: 'animate-spin', style: { display: 'inline-block' } }, '🧭'),
                  h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, scoutStatusText)
                ),
                h('input', {
                  className: 'url-input',
                  type: 'text',
                  placeholder: (importCategoryTab === 'books' || isBookSearchMode)
                    ? 'Type book title or author to search (e.g. Classics, Sci-Fi, Non-Fiction)…'
                    : (importCategoryTab === 'audio' || isSwiftAudioDetected)
                      ? 'Type audiobook title or paste audiobook link…'
                      : (importCategoryTab === 'ln')
                        ? 'Type Light Novel title to search catalog or paste series link…'
                        : 'Type Web Novel title to search aggregators or paste novel URL…',
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
                h('div', {
                  className: 'curated-lib-row',
                  style: {
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginTop: 6,
                    marginBottom: 6
                  }
                },
                  h('span', { style: { fontSize: 11, color: 'var(--slate)', fontWeight: 600, marginRight: 2 } }, 'Curated EPUBs:'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34d399' },
                    onClick: () => {
                      setImportCategoryTab('books');
                      setIsBookSearchMode(true);
                      setBookSearchFilter('standardebooks');
                      if (webImportUrl.trim()) handleSearchBooks(webImportUrl.trim());
                      else toast('✨ Standard Ebooks mode: search curated, beautifully typeset public domain editions.', 'info');
                    },
                    title: 'Search Standard Ebooks for typography-grade curated EPUBs'
                  }, '✨ Standard Ebooks'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(59, 130, 246, 0.35)', color: '#60a5fa' },
                    onClick: () => {
                      setImportCategoryTab('books');
                      setIsBookSearchMode(true);
                      setBookSearchFilter('gutenberg');
                      if (webImportUrl.trim()) handleSearchBooks(webImportUrl.trim());
                      else toast('🏛️ Project Gutenberg: search 70,000+ curated classical books.', 'info');
                    },
                    title: 'Search Project Gutenberg for 70,000+ free EPUB classics'
                  }, '🏛️ Gutenberg (70k+)'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(168, 85, 247, 0.35)', color: '#c084fc' },
                    onClick: () => {
                      setImportCategoryTab('ln');
                      setIsBookSearchMode(false);
                      setIsSwiftAudioMode(false);
                      setNovelSearchFilter('Lnori');
                      if (webImportUrl.trim()) handleSearchNovels(webImportUrl.trim(), 'Lnori');
                      else toast('📖 Lnori: 1-click clean EPUB download for light novels.', 'info');
                    },
                    title: 'Search Lnori for 1-click clean Light Novel EPUBs'
                  }, '📖 Lnori LNs'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24' },
                    onClick: () => {
                      const q = (webImportUrl || '').trim();
                      const targetUrl = q ? `https://oceanofpdf.com/?s=${encodeURIComponent(q)}` : 'https://oceanofpdf.com/';
                      window.open(targetUrl, '_blank');
                      toast(q ? `Opening OceanOfPDF EPUB search for "${q}"…` : 'Opening OceanOfPDF library in browser…', 'info');
                    },
                    title: 'Search OceanOfPDF for 1-click curated EPUB downloads'
                  }, '🌊 OceanOfPDF Mirror'),
                  h('button', {
                    type: 'button',
                    className: 'chip-act',
                    style: { fontSize: 11, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(236, 72, 153, 0.35)', color: '#f472b6' },
                    onClick: () => {
                      const q = (webImportUrl || '').trim();
                      const targetUrl = q ? `https://annas-archive.org/search?q=${encodeURIComponent(q)}&ext=epub` : 'https://annas-archive.org/';
                      window.open(targetUrl, '_blank');
                      toast(q ? `Opening Anna's Archive EPUB search for "${q}"…` : 'Opening Anna\'s Archive in browser…', 'info');
                    },
                    title: "Search Anna's Archive for complete community EPUB editions"
                  }, "🌐 Anna's Archive")
                ),

                // Lnori Detection Card & Direct 1-Click EPUB Button
                isLnoriUrl && !isFetchingUrl && h('div', {
                  className: 'card',
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
                      h('span', null, '✨ Lnori Light Novel Detected'),
                      h('span', { className: 'chip', style: { color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', fontSize: 10.5 } }, '🇬🇧 English Original')
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
                      cursor: 'pointer'
                    },
                    title: 'Directly download from Lnori and package clean EPUB with cover art and volume hierarchy',
                    onClick: () => handleLnoriDirectEpubDownload(webImportUrl)
                  }, '⚡ 1-Click Download Clean EPUB')
                ),

                // Re:Zero (Witch Cult Translations) Dedicated Command Card
                isWitchCultUrl && !isFetchingUrl && (() => {
                  const existingRezero = (webImportHistory || []).find(n => /witchcult|rezero/i.test(n?.sourceUrl || n?.url || n?.title || ''))
                    || (activeCrawlSession && /witchcult|rezero/i.test(activeCrawlSession?.sourceUrl || activeCrawlSession?.url || activeCrawlSession?.title || '') ? activeCrawlSession : null);
                  const existingChCount = existingRezero?.chapters?.length || existingRezero?.rawChapters?.length || 0;

                  return h('div', {
                    className: 'card',
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
                          h('span', null, '👑 Re:Zero Web Novel Complete Archive'),
                          h('span', { className: 'chip', style: { color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)', fontSize: 10.5 } }, 'WCT + TC + Eminent')
                        ),
                        h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginTop: 2, lineHeight: 1.4 } },
                          'Includes Arcs 1–10, Eminent Arc 2 (Next.js RSC decoded), Translation Chicken Arc 4 (257 chapters), Remonwater Rem IF, and 60+ Side Stories & IF Routes.'
                        ),
                        existingChCount > 0 && h('div', { style: { fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4 } },
                          `✅ Saved in Library: ${existingChCount} chapters downloaded locally.`
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
                            cursor: 'pointer'
                          },
                          onClick: () => handleStartFetch(false, null, false, 'https://witchculttranslation.com/table-of-content/')
                        }, '⚡ 1-Click Ingest Re:Zero'),
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
                            cursor: 'pointer'
                          },
                          onClick: handleCheckRezeroUpdates
                        }, '🔄 Check for Updates'),
                        existingChCount > 0 && h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { borderColor: 'rgba(255, 255, 255, 0.2)', fontWeight: 600, fontSize: 11.5 },
                          onClick: async () => {
                            const chs = existingRezero?.chapters || [];
                            if (chs.length === 0) return toast('No chapters available to download.', 'warning');
                            const novelTitle = 'Re:Zero - Starting Life in Another World WN';
                            const novelAuthor = 'Tappei Nagatsuki';
                            try {
                              setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 10 });
                              const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                                setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                              }, { coverUrl: existingRezero?.cover || 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg' });
                              const epubFileName = `${novelTitle} (${chs.length} Ch).epub`;
                              await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(existingRezero));
                              toast(`Re:Zero EPUB (${chs.length} ch) downloaded successfully!`, 'success');
                            } catch (err) {
                              toast('EPUB generation error: ' + err.message, 'error');
                            } finally {
                              setEpubPackagingModal(null);
                            }
                          }
                        }, `📥 Download EPUB (${existingChCount})`)
                      )
                    )
                  );
                })(),

                // SwiftAudiobooks Detection Card (only for specific book URLs)
                isSpecificSwiftAudioBook && !isFetchingUrl && h('div', {
                  className: 'card',
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
                      h('span', null, '🎧 SwiftAudiobooks Detected'),
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
                      style: { background: 'linear-gradient(90deg, #6366f1, #ec4899)', color: '#fff', fontWeight: 700, padding: '8px 14px', border: 'none' },
                      disabled: isSwiftAudioSearching,
                      onClick: () => handleStartPlayAudiobook({ url: webImportUrl })
                    }, '🎧 Listen Now'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { fontWeight: 600, padding: '8px 12px' },
                      disabled: isSwiftAudioSearching,
                      onClick: () => handleOpenAudioDownload({ url: webImportUrl })
                    }, '📥 Download MP3s')
                  )
                ),
                
                // In-line Packaging Progress on Main Screen
                epubPackagingModal && h('div', {
                  className: 'card',
                  style: {
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderColor: 'rgba(99, 102, 241, 0.35)',
                    padding: '12px 14px',
                    margin: '8px 0 10px'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 15 } }, '📦'),
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
                          if (full && full.epubBlob && !full.isEdited && !activeNovelView?.isEdited) {
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
                    }, `📥 Download EPUB (${getSafeChapterCount(activeNovelView)})`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 4px', background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 11 },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters downloaded yet to read.', 'warning');
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setTranslatedChapters([]);
                        setAssembledText('');
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
                    }, `📖 Read (${getSafeChapterCount(activeNovelView)})`),
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
                      style: { padding: '10px 4px', fontWeight: 600, fontSize: 11 },
                      onClick: handleCancelFetch
                    }, '✕ Cancel')
                  )
                ) : !isFetchingUrl ? (
                  h(React.Fragment, null,
                    isSpecificSwiftAudioBook ? null : (
                      (importCategoryTab === 'books' || isBookSearchMode) ? (
                        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 6, margin: '6px 0' } },
                          h('button', {
                            type: 'button',
                            className: 'primary',
                            style: { background: 'linear-gradient(90deg, #10b981, #6366f1)', width: '100%', fontWeight: 700 },
                            disabled: !webImportUrl.trim() || isSearchingBooks,
                            onClick: () => handleSearchBooks(webImportUrl)
                          }, isSearchingBooks ? 'Searching Book Catalogs…' : '🔍 Search Books (Gutenberg, Standard Ebooks, LibGen, Open Library)')
                        )
                      ) : (importCategoryTab === 'audio' || isSwiftAudioDetected) ? (
                        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 6, margin: '6px 0' } },
                          h('button', {
                            type: 'button',
                            className: 'primary',
                            style: { background: 'linear-gradient(90deg, #6366f1, #ec4899)', width: '100%' },
                            disabled: !webImportUrl.trim() || isSwiftAudioSearching,
                            onClick: () => handleSwiftAudioSearch(webImportUrl)
                          }, isSwiftAudioSearching ? 'Searching Audiobooks…' : '🔍 Search Audiobooks')
                        )
                      ) : (
                        h(React.Fragment, null,
                          h('div', { style: { display: 'grid', gridTemplateColumns: (!webImportUrl.trim() || !/^https?:\/\//i.test(webImportUrl.trim())) ? '1fr' : '1fr 1fr', gap: 6, margin: '6px 0' } },
                            isLnoriUrl ? (
                              h(React.Fragment, null,
                                h('button', {
                                  type: 'button',
                                  className: 'primary',
                                  style: { background: 'linear-gradient(90deg, #6366f1, #10b981)', fontWeight: 700 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleLnoriDirectEpubDownload(webImportUrl)
                                }, '⚡ 1-Click Download Clean EPUB'),
                                h('button', {
                                  type: 'button',
                                  className: 'primary ghost',
                                  style: { fontWeight: 600 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleStartFetch(false)
                                }, '⤓ Scrape Chapters')
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
                                  fontWeight: 700
                                },
                                disabled: !webImportUrl.trim() || isSearchingNovels,
                                onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all'))
                              }, isSearchingNovels
                                ? 'Searching Supported Sources…'
                                : (importCategoryTab === 'ln' ? '🔍 Search Light Novels (Lnori Catalog)' : '🔍 Search Web Novels'))
                            ) : (
                              h(React.Fragment, null,
                                h('button', {
                                  type: 'button',
                                  className: 'primary',
                                  style: { fontWeight: 700 },
                                  disabled: !webImportUrl.trim(),
                                  onClick: () => handleStartFetch(false)
                                }, '⤓ Fetch Novel URL'),
                                h('button', {
                                  type: 'button',
                                  className: 'primary ghost',
                                  style: { fontWeight: 600 },
                                  disabled: !webImportUrl.trim() || isSearchingNovels,
                                  onClick: () => handleSearchNovels(webImportUrl, importCategoryTab === 'ln' ? 'Lnori' : (novelSearchFilter || 'all'))
                                }, isSearchingNovels ? 'Searching…' : '🔍 Search Title')
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
                            }, '↺ Reset Tab')
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
                      style: { padding: '10px 8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)', fontWeight: 600 },
                      onClick: handlePauseFetch
                    }, '⏸ Pause Fetch'),
                    getSafeChapterCount(activeNovelView) > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 6px', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, fontSize: 11 },
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
                    }, `📥 EPUB (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn danger',
                      style: { padding: '10px 8px', fontWeight: 600 },
                      onClick: handleCancelFetch
                    }, '✕ Cancel')
                  )
                ),

                isFetchingUrl && h('div', { className: 'status-row' },
                  h('span', null, webImportStatus || 'Extracting chapters…'),
                  h('div', { className: 'mini-progress' }, h('i'))
                ),

                isFetchingPaused && !isFetchingUrl && h('div', {
                  className: 'status-row',
                  style: { background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.25)', color: '#eab308', borderRadius: 4, padding: '8px 12px' }
                },
                  h('span', null, `⏸ Ingestion paused. ${getSafeChapterCount(activeNovelView)} chapters saved. Click "Resume Fetch" to continue.`)
                ),

                activeNovelView && h('div', { className: 'book-card' },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                    h('div', { className: 't', style: { margin: 0, flex: 1 } }, activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || 'Untitled Web Novel'),
                    h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                      h('button', {
                        type: 'button',
                        className: 'mini-btn secondary',
                        style: { fontSize: '11px', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 600 },
                        title: 'Rename this novel',
                        onClick: () => {
                          setRenameModalNovel(activeNovelView);
                          setNewNovelTitleInput(activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || '');
                        }
                      }, '✏️ Rename'),
                      h('button', {
                        type: 'button',
                        className: 'mini-btn ghost',
                        style: { fontSize: '11px', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--slate)' },
                        title: 'Reset view and start a new import or search',
                        onClick: () => {
                          setImportCategoryTab('wn');
                          handleResetImportTab();
                        }
                      }, '✨ New Import')
                    )
                  ),
                  h('div', { className: 'm' }, `By ${activeNovelView.author || 'Unknown'} · ${getSafeChapterCount(activeNovelView)} chapter(s) · ${getSafeChapters(activeNovelView).reduce((a, c) => a + (((c && (c.text || c.content)) || '').split(/\s+/).filter(Boolean).length), 0).toLocaleString()} words`),
                  isLnoriNovel && h('div', {
                    style: {
                      fontSize: '11.5px',
                      color: '#10b981',
                      margin: '4px 0 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600
                    }
                  }, h('span', null, '✨ Official English Light Novel · Direct Clean EPUB Export Recommended (No Translation Needed)')),
                  h('div', { className: 'book-acts' },
                    isLnoriNovel && h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: {
                        background: 'linear-gradient(90deg, #6366f1, #10b981)',
                        color: '#fff',
                        fontWeight: 700,
                        border: 'none',
                        boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                        padding: '9px 14px'
                      },
                      title: 'Directly download clean English EPUB with full illustrations, volume hierarchy, and cover art',
                      onClick: () => exportCleanLnoriEpub(activeNovelView)
                    }, `⚡ Download Clean Lnori EPUB (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', {

                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '8px 14px' },
                      onClick: async () => {
                        const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                        const chs = getSafeChapters(full);
                        if (chs.length === 0) return toast('No chapters available to read.', 'warning');
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setTranslatedChapters([]);
                        setAssembledText('');
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
                    }, `📖 Read (${getSafeChapterCount(activeNovelView)} Ch)`),
                    h('button', { type: 'button', className: 'mini-btn', onClick: async () => {
                      const full = (typeof loadFullNovel === 'function' ? await loadFullNovel(activeNovelView) : null) || activeNovelView;
                      const chs = getSafeChapters(full);
                      const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                      setInputText(fullText);
                      setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                      setActiveNovelRecord(full || activeNovelView);
                      setCurrentDocCover(full?.cover || activeNovelView?.cover || '');
                      setFileName(full?.title || activeNovelView.title || 'Web Novel');
                      setCurrentDocTitle(full?.title || activeNovelView.title || 'Web Novel');
                      checkAndApplyNovelGlossary(full || activeNovelView);
                      setActiveTab('text');
                      toast(`Loaded "${full?.title || activeNovelView.title || 'Novel'}" (${chs.length} ch) to Translator!`, 'info');
                    } }, isLnoriNovel ? '🌐 Translate to Other Lang' : 'Send to Translator'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600 },
                      title: 'Pre-scan chapters with AI to extract characters, genders, and lore terms into a Smart Glossary',
                      onClick: () => handleOpenAutoGlossary(activeNovelView)
                    }, '⚡ Auto-Build Glossary'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: activeNovelView.inSavedSpace ? '#f59e0b' : 'var(--hairline)', color: activeNovelView.inSavedSpace ? '#f59e0b' : 'var(--paper)', fontWeight: 600 },
                      onClick: async () => {
                        await toggleNovelSavedSpace(activeNovelView.id, activeNovelView);
                      }
                    }, (activeNovelView.inSavedSpace ? '⭐ In Saved Space' : '☆ Save to Space')),
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
                          fontWeight: 600
                        },
                        title: 'Set designated folder on device for Moon+ Reader continuity',
                        onClick: () => handleSetNovelFolder(activeNovelView)
                      }, (dispPath ? `📁 ${dispPath.length > 22 ? dispPath.slice(0, 20) + '…' : dispPath}` : '📁 Set Folder'));
                    })(),
                    !isLnoriNovel && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600 },
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
                    }, (activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && getSafeChapterCount(activeNovelView) < activeNovelView.totalChapterCount))
                      ? `📥 Download EPUB (${getSafeChapterCount(activeNovelView)} Ch — Incomplete)`
                      : `📥 Download EPUB (${getSafeChapterCount(activeNovelView)} Ch)`)
                  )
                ),
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
                  const isMultiVolume = distinctNamedVolumes.length >= 2 || (volumeGroups.length >= 2 && distinctNamedVolumes.length >= 1);

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

                  return h('div', { className: 'card' },
                    h('div', { className: 'card-title', style: { flexWrap: 'wrap', gap: '8px' } },
                      h('span', null, isMultiVolume ? `Chapters (${chs.length} in ${distinctNamedVolumes.length || volumeGroups.length} Volumes)` : `Chapters (${chs.length})`),
                      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                        isMultiVolume && h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: areAllCollapsed ? 'Expand all volumes' : 'Collapse all volumes',
                          onClick: toggleExpandAllVolumes
                        }, areAllCollapsed ? '▼ Expand All' : '▲ Collapse All'),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Auto-sort chapters chronologically by number (Prologue → Ch 1 → Ch N)',
                          onClick: autoSortImportChapters
                        }, '🔢 Auto-Sort'),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Use AI to analyze and order chapters into canonical reading sequence',
                          disabled: isAiSorting,
                          onClick: aiReorderImportChapters
                        }, isAiSorting ? '🤖 Sorting…' : '🤖 AI Sort'),
                        h('button', {
                          type: 'button',
                          className: 'chip-act',
                          title: 'Reverse entire chapter order (1 ↔ N)',
                          onClick: reverseImportChapters
                        }, '⇄ Reverse')
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
                                  h('span', { style: { fontWeight: 700 } }, `📁 ${vol.volName}`),
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
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move to Top (Start)', disabled: i === 0, onClick: () => moveImportChapterToEdge(i, 'top') }, '⤒'),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move Up 1', disabled: i === 0, onClick: () => moveImportChapter(i, -1) }, '↑'),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move Down 1', disabled: i >= chs.length - 1, onClick: () => moveImportChapter(i, 1) }, '↓'),
                                      h('button', { type: 'button', className: 'ch-btn', title: 'Move to Bottom (End)', disabled: i >= chs.length - 1, onClick: () => moveImportChapterToEdge(i, 'bottom') }, '⤓'),
                                      h('button', { type: 'button', className: 'ch-btn danger', title: 'Remove Chapter', onClick: () => removeImportChapter(i) }, '✕')
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
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move to Top (Start)', disabled: i === 0, onClick: () => moveImportChapterToEdge(i, 'top') }, '⤒'),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move Up 1', disabled: i === 0, onClick: () => moveImportChapter(i, -1) }, '↑'),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move Down 1', disabled: i >= chs.length - 1, onClick: () => moveImportChapter(i, 1) }, '↓'),
                              h('button', { type: 'button', className: 'ch-btn', title: 'Move to Bottom (End)', disabled: i >= chs.length - 1, onClick: () => moveImportChapterToEdge(i, 'bottom') }, '⤓'),
                              h('button', { type: 'button', className: 'ch-btn danger', title: 'Remove Chapter', onClick: () => removeImportChapter(i) }, '✕')
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
                      h('span', null, '📚 Web Novel Search Results'),
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
                      }, '✕ Clear')
                    )
                  ),
                  (!activeNovelView || !isSearchResultsCollapsed) && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 10 } },
                    novelSearchResults
                      .filter(item => {
                        const f = (novelSearchFilter || 'all').replace(/[\s\-_]+/g, '').toLowerCase();
                        if (f === 'all') return true;
                        const s = (item.source || '').replace(/[\s\-_]+/g, '').toLowerCase();
                        return s === f;
                      })
                      .map((item, idx) => h('div', {
                        key: item.id || idx,
                        className: 'card',
                        style: {
                          padding: 12,
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--hairline)'
                        }
                      },
                        h('div', {
                          style: {
                            width: 68,
                            height: 96,
                            borderRadius: 6,
                            overflow: 'hidden',
                            flexShrink: 0,
                            position: 'relative',
                            background: 'var(--panel)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }
                        },
                          item.cover ? h('img', {
                            src: item.cover,
                            alt: item.title,
                            referrerPolicy: 'no-referrer',
                            onError: (e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            },
                            style: { width: '100%', height: '100%', objectFit: 'cover' }
                          }) : null,
                          h('div', {
                            style: {
                              display: item.cover ? 'none' : 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              height: '100%',
                              fontSize: 24
                            }
                          }, '📖')
                        ),

                        h('div', { style: { flex: 1, minWidth: 0 } },
                          h('div', { style: { display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' } },
                            h('span', {
                              className: 'badge',
                              style: {
                                fontSize: 10,
                                fontWeight: 700,
                                background: item.source === 'NovelBuddy' ? 'rgba(16, 185, 129, 0.15)' : (item.source === 'RoyalRoad' ? 'rgba(59, 130, 246, 0.15)' : (item.source === 'NovelFire' ? 'rgba(245, 158, 11, 0.15)' : (item.source === 'Lnori' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(236, 72, 153, 0.15)'))),
                                color: item.source === 'NovelBuddy' ? '#10b981' : (item.source === 'RoyalRoad' ? '#3b82f6' : (item.source === 'NovelFire' ? '#f59e0b' : (item.source === 'Lnori' ? '#a855f7' : '#ec4899'))),
                                borderColor: item.source === 'NovelBuddy' ? 'rgba(16, 185, 129, 0.3)' : (item.source === 'RoyalRoad' ? 'rgba(59, 130, 246, 0.3)' : (item.source === 'NovelFire' ? 'rgba(245, 158, 11, 0.3)' : (item.source === 'Lnori' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(236, 72, 153, 0.3)')))
                              }
                            }, item.source),
                            item.status && h('span', { className: 'badge', style: { fontSize: 9.5, opacity: 0.8 } }, item.status)
                          ),
                          h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 2 } }, item.title),
                          item.author && h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginBottom: 4 } }, `by ${item.author}`),
                          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 } },
                            item.chapters && h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent, #6366f1)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600 } },
                              `📑 ${item.chapters}`
                            ),
                            item.rating && h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600 } },
                              `${item.rating}`
                            )
                          ),
                          item.summary && h('div', { style: { fontSize: 11, color: 'var(--paper-dim, #94a3b8)', lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } },
                            item.summary
                          ),
                          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                            h('button', {
                              type: 'button',
                              className: 'mini-btn',
                              style: { background: 'var(--accent, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                              onClick: () => {
                                setIsSearchResultsCollapsed(true);
                                setWebImportUrl(item.url);
                                handleStartFetch(false, null, false, item.url);
                              }
                            }, '📥 Fetch Novel'),
                            (item.source === 'Lnori' || /lnori\.(?:org|com)/i.test(item.url)) && h('button', {
                              type: 'button',
                              className: 'mini-btn',
                              style: { background: 'linear-gradient(90deg, #6366f1, #10b981)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                              onClick: () => handleLnoriDirectEpubDownload(item.url)
                            }, '⚡ 1-Click EPUB'),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn ghost',
                              style: { fontSize: 11, fontWeight: 600, padding: '5px 8px' },
                              title: 'Fill URL into import box',
                              onClick: () => {
                                setWebImportUrl(item.url);
                                toast(`Selected "${item.title}". Click "Fetch Novel" to begin!`, 'info');
                              }
                            }, '📋 Select URL'),
                            h('button', {
                              type: 'button',
                              className: 'mini-btn ghost',
                              style: { fontSize: 11, fontWeight: 600, padding: '5px 8px' },
                              onClick: () => window.open(item.url, '_blank')
                            }, '🔗 Open')
                          )
                        )
                      ))
                  )
                ),
                // SwiftAudiobooks Search Results Grid / List
                swiftAudioResults && swiftAudioResults.length > 0 && h('div', { style: { margin: '14px 0 16px' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--paper)' } },
                      h('span', null, '🎧 SwiftAudiobooks Results'),
                      h('span', { className: 'badge', style: { fontSize: 10.5, background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent, #6366f1)' } }, `${swiftAudioResults.length}`)
                    ),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { fontSize: 10.5, padding: '2px 8px' },
                      onClick: () => setSwiftAudioResults([])
                    }, '✕ Clear')
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 10 } },
                    swiftAudioResults.map((item, idx) => h('div', {
                      key: idx,
                      className: 'card',
                      style: {
                        padding: 12,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--hairline)'
                      }
                    },
                      h('div', {
                        style: {
                          width: 64,
                          height: 92,
                          borderRadius: 6,
                          overflow: 'hidden',
                          flexShrink: 0,
                          position: 'relative',
                          background: 'var(--panel)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }
                      },
                        item.cover ? h('img', {
                          src: item.cover,
                          alt: 'Cover',
                          referrerPolicy: 'no-referrer',
                          onError: (e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          },
                          style: { width: '100%', height: '100%', objectFit: 'cover' }
                        }) : null,
                        h('div', {
                          style: {
                            display: item.cover ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            fontSize: 24
                          }
                        }, '🎧')
                      ),

                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 2 } }, item.title),
                        h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginBottom: 4 } }, item.author ? `by ${item.author}` : ''),
                        item.duration && h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent, #6366f1)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, marginBottom: 8 } },
                          `⏱ ${item.duration}`
                        ),
                        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                          h('button', {
                            type: 'button',
                            className: 'mini-btn',
                            style: { background: 'var(--accent, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                            onClick: () => handleStartPlayAudiobook(item)
                          }, '🎧 Listen Now'),
                          h('button', {
                            type: 'button',
                            className: 'mini-btn ghost',
                            style: { fontSize: 11, fontWeight: 600, padding: '5px 8px' },
                            onClick: () => handleOpenAudioDownload(item)
                          }, '📥 Download'),
                          (() => {
                            const inLib = isAudiobookInLibrary(item);
                            return h('button', {
                              type: 'button',
                              className: `mini-btn ${inLib ? '' : 'ghost'}`,
                              style: {
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '5px 8px',
                                color: inLib ? '#f59e0b' : 'var(--paper-dim)',
                                borderColor: inLib ? 'rgba(245, 158, 11, 0.4)' : 'var(--hairline)',
                                background: inLib ? 'rgba(245, 158, 11, 0.12)' : undefined
                              },
                              title: inLib ? 'In Library (tap to remove)' : 'Save to Library for later',
                              onClick: () => inLib ? removeAudiobookFromLibrary(item) : saveAudiobookToLibrary(item)
                            }, inLib ? '⭐ In Library' : '☆ Add to Library');
                          })()
                        )
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
                        h('span', null, '📚 Book Search Results'),
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
                          '⚡ Direct Downloads Only'
                        ),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 10.5, padding: '2px 8px' },
                          onClick: () => setBookSearchResults([])
                        }, '✕ Clear')
                      )
                    ),
                    displayedBooks.length === 0 ? h('div', {
                      style: {
                        padding: '16px',
                        textAlign: 'center',
                        color: 'var(--paper-dim)',
                        background: 'var(--card-bg)',
                        border: '1px dashed var(--hairline)',
                        borderRadius: 8,
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
                    ) : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 12 } },
                      displayedBooks.map((item, idx) => {
                        const isEpub = item.format === 'EPUB' || (item.formatBadge && item.formatBadge.includes('EPUB'));
                        const isPdf = item.format === 'PDF' || (item.formatBadge && item.formatBadge.includes('PDF'));
                        const isCatalog = item.format === 'CATALOG' || (item.formatBadge && item.formatBadge.includes('Catalog'));

                        return h('div', {
                          key: item.id || idx,
                          className: 'card',
                          style: {
                            padding: 12,
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--hairline)',
                            borderRadius: 8
                          }
                        },
                          h('div', {
                            style: {
                              width: 68,
                              height: 98,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: 'var(--panel)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }
                          },
                            item.cover ? h('img', {
                              src: item.cover,
                              alt: 'Cover',
                              referrerPolicy: 'no-referrer',
                              onError: (e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              },
                              style: { width: '100%', height: '100%', objectFit: 'cover' }
                            }) : null,
                            h('div', {
                              style: {
                                display: item.cover ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                height: '100%',
                                fontSize: 26
                              }
                            }, isPdf ? '📄' : '📖')
                          ),

                          h('div', { style: { flex: 1, minWidth: 0 } },
                            h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--paper)', lineHeight: 1.3, marginBottom: 2 } }, item.title),
                            h('div', { style: { fontSize: 11.5, color: 'var(--slate)', marginBottom: 4 } }, item.authors ? `by ${item.authors}` : ''),
                            h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 } },
                              h('span', { className: 'chip', style: { fontSize: 10, padding: '1px 6px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' } }, item.sourceBadge || item.source),
                              isEpub ? h('span', {
                                className: 'chip',
                                style: {
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '1px 8px',
                                  color: '#10b981',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  borderColor: 'rgba(16, 185, 129, 0.5)'
                                }
                              }, '⚡ EPUB') : null,
                              isPdf ? h('span', {
                                className: 'chip',
                                style: {
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '1px 8px',
                                  color: '#f59e0b',
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  borderColor: 'rgba(245, 158, 11, 0.5)'
                                }
                              }, '📄 PDF') : null,
                              (!isEpub && !isPdf && !isCatalog && item.formatBadge) ? h('span', {
                                className: 'chip',
                                style: {
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '1px 8px',
                                  color: '#8b5cf6',
                                  background: 'rgba(139, 92, 246, 0.12)',
                                  borderColor: 'rgba(139, 92, 246, 0.5)'
                                }
                              }, item.formatBadge) : null,
                              isCatalog ? h('span', {
                                className: 'chip',
                                style: {
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 7px',
                                  color: '#94a3b8',
                                  background: 'rgba(148, 163, 184, 0.12)',
                                  borderColor: 'rgba(148, 163, 184, 0.35)'
                                }
                              }, 'ℹ️ Catalog Record (Borrow / View Only)') : null,
                              item.year && h('span', { style: { fontSize: 10, color: 'var(--slate)' } }, item.year)
                            ),
                            item.summary && h('div', { style: { fontSize: 10.5, color: 'var(--paper-dim)', lineHeight: 1.3, marginBottom: 8 } }, item.summary),
                            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                              // 1. EPUB Download & Open / Save
                              isEpub && (item.directEpub || item.epubUrl || item.downloadUrl) ? [
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn',
                                  style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                                  onClick: () => handleDownloadBookEpub(item)
                                }, '📥 Download & Open EPUB'),
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 8px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' },
                                  onClick: () => handleSaveBookEpub(item)
                                }, '💾 Save EPUB')
                              ] : null,

                              // 2. PDF Download & Open / Save
                              isPdf && (item.downloadUrl || item.epubUrl) ? [
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn',
                                  style: { background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                                  onClick: () => handleDownloadBookEpub(item)
                                }, '📥 Download & Open PDF'),
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 8px', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' },
                                  onClick: () => handleSaveBookEpub(item)
                                }, '💾 Save PDF')
                              ] : null,

                              // 3. Other formats (MOBI, AZW3, etc.)
                              (!isEpub && !isPdf && !isCatalog && item.downloadUrl) ? [
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn',
                                  style: { background: 'var(--accent, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px' },
                                  onClick: () => handleDownloadBookEpub(item)
                                }, `📥 Download & Open ${item.format || ''}`),
                                h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 8px' },
                                  onClick: () => handleSaveBookEpub(item)
                                }, `💾 Save ${item.format || 'Book'}`)
                              ] : null,

                              // 4. External Mirror link (for direct downloadable sources like LibGen)
                              (item.downloadUrl && !item.downloadUrl.includes('archive.org/download/')) ? h('button', {
                                type: 'button',
                                className: 'mini-btn ghost',
                                style: { fontSize: 11, fontWeight: 600, padding: '5px 8px' },
                                onClick: () => (window.BookSearchEngine?.openExternalUrl || window.open)(item.downloadUrl, '_blank')
                              }, '🌐 Mirror ↗') : null,

                              // 5. Catalog & Borrowable Records (Internet Archive CDL + 1-tap Shadow Search)
                              (!item.directEpub && !item.downloadUrl) ? [
                                item.iaUrl ? h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 10px', color: 'var(--accent, #6366f1)', borderColor: 'rgba(99, 102, 241, 0.4)' },
                                  onClick: () => (window.BookSearchEngine?.openExternalUrl || window.open)(item.iaUrl, '_blank')
                                }, '🏛️ Borrow on Internet Archive ↗') : null,
                                item.annasUrl ? h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 10px', color: 'var(--iris, #818cf8)', borderColor: 'rgba(129, 140, 248, 0.4)' },
                                  onClick: () => (window.BookSearchEngine?.openExternalUrl || window.open)(item.annasUrl, '_blank')
                                }, '🔍 Find on Anna\'s Archive ↗') : null,
                                item.oceanUrl ? h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' },
                                  onClick: () => (window.BookSearchEngine?.openExternalUrl || window.open)(item.oceanUrl, '_blank')
                                }, '📄 Find on OceanOfPDF ↗') : null,
                                item.workUrl ? h('button', {
                                  type: 'button',
                                  className: 'mini-btn ghost',
                                  style: { fontSize: 11, fontWeight: 600, padding: '5px 10px', color: 'var(--slate)', borderColor: 'var(--hairline)' },
                                  onClick: () => (window.BookSearchEngine?.openExternalUrl || window.open)(item.workUrl, '_blank')
                                }, '📖 View on Open Library ↗') : null
                              ] : null
                            )
                          )
                        );
                      })
                    ),
                    // Anna's Archive & OceanOfPDF 1-Tap Exploration Footer Card
                    h('div', {
                      style: {
                        marginTop: 14,
                        padding: '12px 14px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px dashed rgba(99, 102, 241, 0.3)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10
                      }
                    },
                      h('div', { style: { fontSize: 11.5, color: 'var(--paper-dim)' } },
                        'Looking for more editions, comics, or PDFs? Search external shadow mirrors:'
                      ),
                      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 11, color: 'var(--iris)', borderColor: 'rgba(99, 102, 241, 0.4)' },
                          onClick: () => {
                            const q = (webImportUrl || '').trim();
                            const u = window.BookSearchEngine?.getAnnasArchiveSearchUrl(q);
                            (window.BookSearchEngine?.openExternalUrl || window.open)(u, '_blank');
                          }
                        }, '🔍 Anna\'s Archive (.gl) ↗'),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 11, color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' },
                          onClick: () => {
                            const q = (webImportUrl || '').trim();
                            const u = window.BookSearchEngine?.getAnnasArchivePkSearchUrl(q);
                            (window.BookSearchEngine?.openExternalUrl || window.open)(u, '_blank');
                          }
                        }, '🔍 Anna\'s (.pk mirror) ↗'),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 11, color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' },
                          onClick: () => {
                            const q = (webImportUrl || '').trim();
                            const u = window.BookSearchEngine?.getOceanOfPdfSearchUrl(q);
                            (window.BookSearchEngine?.openExternalUrl || window.open)(u, '_blank');
                          }
                        }, '📄 OceanOfPDF (.site) ↗'),
                        h('button', {
                          type: 'button',
                          className: 'mini-btn ghost',
                          style: { fontSize: 11, color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.4)' },
                          onClick: () => {
                            const q = (webImportUrl || '').trim();
                            const u = window.BookSearchEngine?.getZLibrarySearchUrl(q);
                            (window.BookSearchEngine?.openExternalUrl || window.open)(u, '_blank');
                          }
                        }, '📚 Z-Library ↗')
                      )
                    )
                  );
                })(),

                sourcesModalOpen && h(SourcesInfoModal, {
                  isOpen: sourcesModalOpen,
                  onClose: () => setSourcesModalOpen(false)
                })

              );
            
  }

  return { TabImporter };
}));
