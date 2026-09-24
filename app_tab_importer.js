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

  function TabImporter(props) {
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
      dismissCrawlSession,
      handleSearchNovels,
      handleSwiftAudioSearch,
      handleOpenSourcePluginsModal,
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
                  h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'var(--accent, #6366f1)', color: '#fff', fontWeight: 600 },
                      onClick: () => {
                        setWebImportError(null);
                        handleStartFetch(true);
                      }
                    }, '▶ Resume Fetch'),
                    webImportError.targetUrl && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontWeight: 600 },
                      onClick: () => {
                        window.open(webImportError.targetUrl, '_blank');
                      }
                    }, '🌐 Open Source in Browser'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
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
                    h('span', { style: { fontSize: 11, color: 'var(--slate)' } }, `${(activeCrawlSession.chapters || []).length} / ${activeCrawlSession.totalChapterCount || '?'} chapters`)
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
                        const chs = activeCrawlSession.chapters || [];
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
                    }, `📥 Download EPUB (${(activeCrawlSession.chapters || []).length} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700 },
                      onClick: () => {
                        const chs = activeCrawlSession.chapters || [];
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
                    }, `📖 Read (${(activeCrawlSession.chapters || []).length} Ch)`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      onClick: () => {

                        const chs = activeCrawlSession.chapters || [];
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

                h('div', { className: 'src-chips', style: { alignItems: 'center' } },
                  h('button', {
                    type: 'button',
                    className: 'mini-btn',
                    style: {
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--iris)',
                      border: '1px solid currentColor',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 999
                    },
                    onClick: handleOpenSourcePluginsModal,
                    title: 'Manage built-in source plugins and browse 278 LNReader community plugins'
                  }, '🔌 Source Plugins (278+)'),
                  h('button', {
                    type: 'button',
                    className: 'src-chip',
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
                      borderRadius: 999
                    },
                    onClick: () => ongoingEpubInputRef.current?.click(),
                    title: 'Upload an existing EPUB to auto-search sources and fetch new chapters'
                  }, '⚡ Continue EPUB'),
                  ['👑 Re:Zero (WCT)', 'Lnori', 'SwiftAudio', 'NovelBuddy', 'RoyalRoad', 'NovelFire', 'NovelBin', 'AO3', 'Pixiv', 'Syosetu'].map(s => {
                    const isRezeroChip = s === '👑 Re:Zero (WCT)';
                    const isSwiftChip = s === 'SwiftAudio';
                    const isLnoriChip = s === 'Lnori';
                    const isRezeroActive = isRezeroChip && isWitchCultUrl;
                    const isSwiftActive = isSwiftChip && isSwiftAudioDetected;
                    const isLnoriActive = isLnoriChip && novelSearchFilter === 'Lnori';
                    const isFilterActive = (novelSearchFilter || '').toLowerCase() === s.toLowerCase();
                    const isChipActive = isRezeroActive || isSwiftActive || isLnoriActive || isFilterActive;
                    return h('span', {
                      key: s,
                      className: `src-chip ${isChipActive ? 'accent' : ''}`,
                      style: isRezeroActive
                        ? { borderColor: 'rgba(168, 85, 247, 0.6)', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', fontWeight: 700, cursor: 'pointer' }
                        : (isSwiftActive
                            ? { borderColor: 'rgba(236, 72, 153, 0.5)', color: '#ec4899', fontWeight: 600, cursor: 'pointer' }
                            : (isLnoriActive || isFilterActive
                                ? { borderColor: 'rgba(99, 102, 241, 0.6)', color: 'var(--iris)', background: 'rgba(99, 102, 241, 0.15)', fontWeight: 700, cursor: 'pointer' }
                                : { cursor: 'pointer' })),
                      onClick: () => {
                        if (isRezeroChip) {
                          setIsSwiftAudioMode(false);
                          setWebImportUrl('https://witchculttranslation.com/table-of-content/');
                          toast('👑 Re:Zero (Witch Cult Translations) selected! Ready to ingest or update.', 'info');
                        } else if (isSwiftChip) {
                          setIsSwiftAudioMode(true);
                          if (!webImportUrl || webImportUrl === 'https://swiftaudiobooks.com/') {
                            setWebImportUrl('');
                          }
                          toast('SwiftAudiobooks selected! Type any book title or paste link.', 'info');
                        } else if (isLnoriChip) {
                          setIsSwiftAudioMode(false);
                          setNovelSearchFilter('Lnori');
                          if (webImportUrl && !/^https?:\/\//i.test(webImportUrl.trim())) {
                            handleSearchNovels(webImportUrl, 'Lnori');
                          } else if (!webImportUrl) {
                            toast('📖 Lnori selected! Type a title or keyword to search the light novel catalog.', 'info');
                          }
                        } else {
                          setIsSwiftAudioMode(false);
                          if (['NovelBuddy', 'RoyalRoad', 'NovelFire'].includes(s)) {
                            setNovelSearchFilter(s);
                            if (webImportUrl && !/^https?:\/\//i.test(webImportUrl.trim())) {
                              handleSearchNovels(webImportUrl, s);
                            } else if (!webImportUrl) {
                              toast(`${s} selected! Type a title or keyword to search.`, 'info');
                            }
                          } else if (s === 'NovelBin') {
                            setNovelSearchFilter(s);
                            if (webImportUrl && !/^https?:\/\//i.test(webImportUrl.trim())) {
                              handleSearchNovels(webImportUrl, s);
                            } else {
                              toast('NovelBin selected! Paste any novel-bin.com or novelbin.me URL, or type title to search.', 'info');
                            }
                          } else if (s === 'AO3') {
                            toast('AO3 works via direct work links (e.g. archiveofourown.org/works/...). Paste any link to import!', 'info');
                          } else if (s === 'Pixiv') {
                            toast('Pixiv selected! Paste any pixiv.net/novel/series or novel/show link to import.', 'info');
                          } else if (s === 'Syosetu') {
                            toast('Syosetu selected! Paste any ncode.syosetu.com or kakuyomu.jp novel link to import.', 'info');
                          }
                        }
                      }
                    }, isSwiftChip ? '🎧 SwiftAudio' : (s === 'NovelBuddy' ? '✨ NovelBuddy' : (s === 'Lnori' ? '📖 Lnori' : s)));
                  })),
                h('input', {
                  className: 'url-input',
                  type: 'text',
                  placeholder: isSwiftAudioDetected ? 'Type audiobook title (e.g. Shadow Slave, Harry Potter) or paste link…' : 'Type novel title to search (e.g. Horror Game Developer, Shadow Slave) or paste novel URL…',
                  value: webImportUrl,
                  onChange: (e) => {
                    setWebImportUrl(e.target.value);
                    if (!e.target.value.trim()) setIsSwiftAudioMode(false);
                  },
                  onKeyDown: (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isSwiftAudioDetected) {
                        handleSwiftAudioSearch(webImportUrl);
                      } else if (/^https?:\/\//i.test((webImportUrl || '').trim())) {
                        handleStartFetch(false);
                      } else if ((webImportUrl || '').trim()) {
                        handleSearchNovels(webImportUrl);
                      }
                    }
                  }
                }),

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
                        const chs = activeNovelView?.chapters || [];
                        if (chs.length === 0) return toast('No chapters downloaded yet to export.', 'warning');
                        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(activeNovelView.title, chs) : (activeNovelView.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(activeNovelView.author) : (activeNovelView.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        try {
                          if (activeNovelView && activeNovelView.epubBlob && !activeNovelView.isEdited) {
                            const isInc = activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                            const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                            await saveUniversalBlob(activeNovelView.epubBlob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeNovelView));
                            toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                            return;
                          }
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: activeNovelView?.id || activeNovelView?.sourceUrl || novelTitle, coverUrl: activeNovelView?.cover || '' }) : { coverUrl: activeNovelView?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const isInc = activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeNovelView));
                          toast(`EPUB downloaded! (${chs.length} chapters)`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, `📥 Download EPUB (${activeNovelView?.chapters?.length || 0})`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 4px', background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: 11 },
                      onClick: () => {
                        const chs = activeNovelView?.chapters || [];
                        if (chs.length === 0) return toast('No chapters downloaded yet to read.', 'warning');
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setTranslatedChapters([]);
                        setAssembledText('');
                        const novelKey = activeNovelView?.id || activeNovelView?.title || 'web_import_novel';
                        setReaderNovelId(novelKey);
                        setReaderNovelTitle(activeNovelView?.title || 'Web Novel');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${activeNovelView?.title || 'Novel'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        } else {
                          toast(`Reading "${activeNovelView?.title || 'Novel'}" (${chs.length} ch)!`, 'success');
                        }
                      }
                    }, `📖 Read (${activeNovelView?.chapters?.length || 0})`),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 4px', fontWeight: 600, fontSize: 11 },
                      onClick: () => {

                        const chs = activeNovelView?.chapters || [];
                        if (chs.length === 0) return toast('No chapters downloaded yet to send.', 'warning');
                        const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                        setInputText(fullText);
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setActiveNovelRecord(activeNovelView);
                        setCurrentDocCover(activeNovelView?.cover || '');
                        setFileName(activeNovelView.title || 'Web Novel');
                        setCurrentDocTitle(activeNovelView.title || 'Web Novel');
                        setActiveTab('text');
                        toast(`Loaded "${activeNovelView.title || 'Novel'}" (${chs.length} ch) to Translator!`, 'info');
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
                      isSwiftAudioDetected ? (
                        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 6, margin: '6px 0' } },
                          h('button', {
                            type: 'button',
                            className: 'primary',
                            style: { background: 'linear-gradient(90deg, #6366f1, #ec4899)', width: '100%' },
                            disabled: !webImportUrl.trim() || isSwiftAudioSearching,
                            onClick: () => handleSwiftAudioSearch(webImportUrl)
                          }, isSwiftAudioSearching ? 'Searching…' : '🔍 Search Audiobooks')
                        )
                      ) : (
                        h('div', { style: { display: 'grid', gridTemplateColumns: (!webImportUrl.trim() || !/^https?:\/\//i.test(webImportUrl.trim())) ? '1fr' : '1fr 1fr', gap: 6, margin: '6px 0' } },
                          (!webImportUrl.trim() || !/^https?:\/\//i.test(webImportUrl.trim())) ? (
                            h('button', {
                              type: 'button',
                              className: 'primary',
                              style: { background: 'linear-gradient(90deg, #6366f1, #3b82f6)', width: '100%', fontWeight: 700 },
                              disabled: !webImportUrl.trim() || isSearchingNovels,
                              onClick: () => handleSearchNovels(webImportUrl)
                            }, isSearchingNovels ? 'Searching Supported Sources…' : '🔍 Search Web Novels')
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
                                onClick: () => handleSearchNovels(webImportUrl)
                              }, isSearchingNovels ? 'Searching…' : '🔍 Search Title')
                            )
                          )
                        )
                      )
                    )
                  )
                ) : (
                  h('div', { style: { display: 'grid', gridTemplateColumns: (activeNovelView?.chapters?.length || 0) > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6, margin: '6px 0' } },
                    h('button', {
                      type: 'button',
                      className: 'mini-btn',
                      style: { padding: '10px 8px', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)', fontWeight: 600 },
                      onClick: handlePauseFetch
                    }, '⏸ Pause Fetch'),
                    (activeNovelView?.chapters?.length || 0) > 0 && h('button', {
                      type: 'button',
                      className: 'mini-btn ghost',
                      style: { padding: '10px 6px', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e', fontWeight: 600, fontSize: 11 },
                      onClick: async () => {
                        const chs = activeNovelView?.chapters || [];
                        if (chs.length === 0) return toast('No chapters downloaded yet.', 'warning');
                        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(activeNovelView.title, chs) : (activeNovelView.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(activeNovelView.author) : (activeNovelView.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
                        try {
                          setEpubPackagingModal({ title: novelTitle, status: `Packaging ${chs.length} chapters…`, pct: 5 });
                          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: activeNovelView?.id || activeNovelView?.sourceUrl || novelTitle, coverUrl: activeNovelView?.cover || '' }) : { coverUrl: activeNovelView?.cover || '' };
                          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
                            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
                          }, opts);
                          const isInc = activeNovelView?.isIncomplete || (activeNovelView?.totalChapterCount && chs.length < activeNovelView.totalChapterCount);
                          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
                          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(activeNovelView));
                          toast(`EPUB (${chs.length} chapters) saved!`, 'success');
                        } catch (e) {
                          toast('EPUB export error: ' + e.message, 'error');
                        } finally {
                          setEpubPackagingModal(null);
                        }
                      }
                    }, `📥 EPUB (${activeNovelView.chapters.length} Ch)`),
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
                  h('span', null, `⏸ Ingestion paused. ${activeNovelView?.chapters?.length || 0} chapters saved. Click "Resume Fetch" to continue.`)
                ),

                activeNovelView && h('div', { className: 'book-card' },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
                    h('div', { className: 't', style: { margin: 0, flex: 1 } }, activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || 'Untitled Web Novel'),
                    h('button', {
                      type: 'button',
                      className: 'mini-btn secondary',
                      style: { fontSize: '11px', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontWeight: 600 },
                      title: 'Rename this novel',
                      onClick: () => {
                        setRenameModalNovel(activeNovelView);
                        setNewNovelTitleInput(activeNovelView.customTitle || getCustomTitle(activeNovelView) || activeNovelView.title || '');
                      }
                    }, '✏️ Rename')
                  ),
                  h('div', { className: 'm' }, `By ${activeNovelView.author || 'Unknown'} · ${(activeNovelView.chapters || []).length} chapter(s) · ${(activeNovelView.chapters || []).reduce((a, c) => a + ((c.text || c.content || '').split(/\s+/).filter(Boolean).length), 0).toLocaleString()} words`),
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
                    }, `⚡ Download Clean Lnori EPUB (${(activeNovelView.chapters || []).length} Ch)`),
                    h('button', {

                      type: 'button',
                      className: 'mini-btn',
                      style: { background: 'linear-gradient(90deg, #10b981, #059669)', color: '#fff', fontWeight: 700, padding: '8px 14px' },
                      onClick: () => {
                        const chs = activeNovelView.chapters || [];
                        if (chs.length === 0) return toast('No chapters available to read.', 'warning');
                        setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                        setTranslatedChapters([]);
                        setAssembledText('');
                        const novelKey = activeNovelView?.id || activeNovelView?.title || 'web_import_novel';
                        setReaderNovelId(novelKey);
                        setReaderNovelTitle(activeNovelView?.title || 'Web Novel');
                        const savedProg = window.getReadingProgress ? window.getReadingProgress(novelKey) : null;
                        const resumeIdx = (savedProg && typeof savedProg.chapterIdx === 'number') ? savedProg.chapterIdx : 0;
                        setReaderChapterIdx(resumeIdx);
                        setReaderOpen(true);
                        if (savedProg && resumeIdx > 0) {
                          toast(`Resuming "${activeNovelView?.title || 'Novel'}" at Chapter ${resumeIdx + 1}!`, 'success');
                        } else {
                          toast(`Reading "${activeNovelView?.title || 'Novel'}" (${chs.length} ch)!`, 'success');
                        }
                      }
                    }, `📖 Read (${(activeNovelView.chapters || []).length} Ch)`),
                    h('button', { type: 'button', className: 'mini-btn', onClick: () => {

                      const chs = activeNovelView.chapters || [];
                      const fullText = chs.map(c => `# ${c.title}\n\n${c.text || c.content}`).join('\n\n');
                      setInputText(fullText);
                      setChapters(chs.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })));
                      setActiveNovelRecord(activeNovelView);
                      setCurrentDocCover(activeNovelView?.cover || '');
                      setFileName(activeNovelView.title || 'Web Novel');
                      setCurrentDocTitle(activeNovelView.title || 'Web Novel');
                      checkAndApplyNovelGlossary(activeNovelView);
                      setActiveTab('text');
                      toast(`Loaded "${activeNovelView.title || 'Novel'}" (${chs.length} ch) to Translator!`, 'info');
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
                          const chs = full.chapters || activeNovelView.chapters || [];
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
                    }, (activeNovelView.isIncomplete || (activeNovelView.totalChapterCount && (activeNovelView.chapters || []).length < activeNovelView.totalChapterCount))
                      ? `📥 Download EPUB (${(activeNovelView.chapters || []).length} Ch — Incomplete)`
                      : `📥 Download EPUB (${(activeNovelView.chapters || []).length} Ch)`)
                  )
                ),
                activeNovelView && activeNovelView.chapters && activeNovelView.chapters.length > 0 && (() => {
                  const chs = activeNovelView.chapters;
                  const volRegex = /^(?:\[\s*)?(Volume|Vol\.?|Book|Arc)\s*(\d+|[IVXLCDM]+)[\s:–—,-]*(.*)$/i;
                  const volumeGroups = [];
                  let curGroup = null;

                  chs.forEach((ch, globalIdx) => {
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

                    if (!curGroup || (volName && curGroup.volName !== volName)) {
                      curGroup = {
                        volKey: volName ? `vol_${volName.replace(/\s+/g, '_')}` : `group_${volumeGroups.length + 1}`,
                        volName: volName || (volumeGroups.length === 0 ? 'Prologue / General' : 'Extra / Other'),
                        hasRealVolume: Boolean(volName),
                        items: []
                      };
                      volumeGroups.push(curGroup);
                    }

                    curGroup.items.push({
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

              );
            
  }

  return { TabImporter };
}));
