/**
 * Gemini EPUB Translator - Web Novel Crawler & EPUB Engine
 * Module: crawler_engine.js
 * 
 * Provides:
 * - searchNovels: Unified multi-source & plugin novel search with deduplication and source fallback
 * - startCrawl: Initiates or resumes multi-chapter crawl with wake lock, throttled persistence, error handling
 * - pauseCrawl: Pauses active crawl, releases wake lock, persists state
 * - cancelCrawl: Cancels active crawl, releases wake lock
 * - exportCleanLnoriEpub: Direct exporter for clean EPUB packaging with hierarchical TOC and embedded media
 * - directEpubDownload: 1-click one-shot download or library export for web novels
 * - resumeCrawlFromSession: Hydrates session and resumes crawl
 * - dismissCrawlSession: Clears active crawl session
 */

(function (global) {
  'use strict';

  function safeToast(callbacks, msg, type) {
    if (typeof callbacks?.toast === 'function') {
      callbacks.toast(msg, type);
    } else if (typeof global !== 'undefined' && typeof global.toast === 'function') {
      global.toast(msg, type);
    } else if (typeof window !== 'undefined' && typeof window.toast === 'function') {
      window.toast(msg, type);
    } else {
      console.log(`[${type || 'info'}] ${msg}`);
    }
  }

  function safeGetNovelFolderOptions(options, novelData) {
    if (typeof options?.getNovelFolderOptions === 'function') {
      return options.getNovelFolderOptions(novelData);
    }
    if (typeof window !== 'undefined' && window.MoonReaderEngine?.getNovelFolderOptions) {
      return window.MoonReaderEngine.getNovelFolderOptions(novelData);
    }
    return {};
  }

  function safeGetCustomTitle(options, idOrUrl) {
    if (typeof options?.getCustomTitle === 'function') {
      return options.getCustomTitle(idOrUrl);
    }
    if (typeof window !== 'undefined' && window.LibraryEngine?.getCustomTitle) {
      return window.LibraryEngine.getCustomTitle(idOrUrl);
    }
    return '';
  }

  function safeCleanBookTitle(options, title, fallbackChs) {
    if (typeof options?.cleanBookTitle === 'function') {
      return options.cleanBookTitle(title, fallbackChs);
    }
    if (typeof window !== 'undefined' && typeof window.cleanBookTitle === 'function') {
      return window.cleanBookTitle(title, fallbackChs);
    }
    return title || 'Web Novel';
  }

  function safeCleanBookAuthor(options, author) {
    if (typeof options?.cleanBookAuthor === 'function') {
      return options.cleanBookAuthor(author);
    }
    if (typeof window !== 'undefined' && typeof window.cleanBookAuthor === 'function') {
      return window.cleanBookAuthor(author);
    }
    return author || 'Unknown Author';
  }

  function safeGetEpubOptions(options, extraOpts) {
    if (typeof options?.getEpubOptions === 'function') {
      return options.getEpubOptions(extraOpts);
    }
    if (typeof window !== 'undefined' && typeof window.getEpubOptions === 'function') {
      return window.getEpubOptions(extraOpts);
    }
    return {};
  }

  function safeGetEpubFileName(options, title, count, isPartial) {
    if (typeof options?.getEpubFileName === 'function') {
      return options.getEpubFileName(title, count, isPartial);
    }
    if (typeof window !== 'undefined' && typeof window.getEpubFileName === 'function') {
      return window.getEpubFileName(title, count, isPartial);
    }
    const clean = (title || 'Novel').replace(/[\\/:*?"<>|]+/g, '_').trim();
    return isPartial ? `${clean}_incomplete_${count}chs.epub` : `${clean}_${count}chs.epub`;
  }

  function safeFlushCrawlPersistence(session, options, callbacks) {
    if (!session) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gemini_active_crawl_session', JSON.stringify(session));
      }
    } catch (e) {}

    if (typeof callbacks?.saveNovelToHistory === 'function') {
      callbacks.saveNovelToHistory(session);
    } else if (typeof options?.saveNovelToHistory === 'function') {
      options.saveNovelToHistory(session);
    } else if (typeof window !== 'undefined' && window.LibraryEngine?.saveNovelToHistory) {
      window.LibraryEngine.saveNovelToHistory(session);
    }
  }

  /**
   * Start or resume a web novel crawl
   */
  async function startCrawl({ targetUrl, isResume = false, resumeSessionData = null, autoExportEpub = false, options = {}, callbacks = {} } = {}) {
    const targetSession = resumeSessionData || (isResume ? (options.activeCrawlSession || null) : null);
    const resolvedUrl = (targetUrl || targetSession?.url || targetSession?.sourceUrl || options.webImportUrl || '').trim();

    if (!resolvedUrl) {
      safeToast(callbacks, 'Please enter a novel URL to fetch.', 'warning');
      return;
    }

    callbacks.setIsFetchingUrl?.(true);
    callbacks.setIsFetchingPaused?.(false);
    callbacks.setWebImportError?.(null);
    callbacks.setWebImportStatus?.(isResume ? 'Resuming novel crawl…' : 'Connecting to source…');

    if (typeof window !== 'undefined') {
      window.__scrapeImages = options.scrapeImages !== undefined ? options.scrapeImages : true;
      try {
        window.NativeBridge?.acquireWakeLock?.('Gemini Web Importer', isResume ? 'Resuming novel crawl...' : 'Starting novel download...');
      } catch (e) {}
    }

    const initialChapters = targetSession?.chapters || targetSession?.rawChapters || [];
    const novelId = targetSession?.id || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

    let lastPersistTime = 0;
    let pendingSaveTimer = null;
    let latestSessionSnapshot = null;

    const flushSession = (sess) => safeFlushCrawlPersistence(sess, options, callbacks);

    try {
      if (!window.WebNovelImporter || typeof window.WebNovelImporter.importUrl !== 'function') {
        throw new Error('WebNovelImporter module is not available.');
      }

      const data = await window.WebNovelImporter.importUrl(resolvedUrl, (status, pct) => {
        callbacks.setWebImportStatus?.(status);
        callbacks.onProgress?.(status, pct);
      }, {
        initialChapters,
        onChapterDone: (newChapterObj, allChapters, stats) => {
          const totalChs = stats.total || stats.totalCount || targetSession?.totalChapterCount || (stats.chapterList ? stats.chapterList.length : 0);
          const currentTotal = totalChs > 0 ? totalChs : Math.max(allChapters.length + 1, targetSession?.totalChapterCount || 0);
          const isIncomplete = totalChs > 0 ? (allChapters.length < totalChs) : true;

          const existingFolder = safeGetNovelFolderOptions(options, { id: novelId, title: stats.title || targetSession?.title, sourceUrl: resolvedUrl });
          const customTitle = targetSession?.customTitle ||
            safeGetCustomTitle(options, resolvedUrl) ||
            safeGetCustomTitle(options, novelId) ||
            (targetSession?.title !== stats.title ? targetSession?.title : null);

          const sessionObj = {
            id: novelId,
            url: resolvedUrl,
            sourceUrl: resolvedUrl,
            title: customTitle || stats.title || targetSession?.title || 'Web Novel',
            customTitle: customTitle || undefined,
            originalSourceTitle: stats.title || targetSession?.originalSourceTitle || targetSession?.title || undefined,
            author: stats.author || targetSession?.author || 'Unknown',
            summary: stats.summary || targetSession?.summary || '',
            cover: stats.cover || targetSession?.cover || '',
            chapters: allChapters,
            chapterList: stats.chapterList || targetSession?.chapterList || [],
            completedCount: allChapters.length,
            totalChapterCount: currentTotal,
            isIncomplete: isIncomplete,
            folderTreeUri: targetSession?.folderTreeUri || existingFolder.treeUri || '',
            folderPath: targetSession?.folderPath || existingFolder.folderPath || '',
            inSavedSpace: targetSession?.inSavedSpace !== undefined ? targetSession.inSavedSpace : undefined,
            timestamp: new Date().toISOString()
          };
          latestSessionSnapshot = sessionObj;

          // Smooth 1.5s throttled persistence to IndexedDB & localStorage so UI stays 60fps
          const now = Date.now();
          if (now - lastPersistTime > 1500) {
            lastPersistTime = now;
            callbacks.setActiveCrawlSession?.(sessionObj);
            callbacks.setWebImportData?.(sessionObj);
            flushSession(sessionObj);
          } else {
            if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
            pendingSaveTimer = setTimeout(() => {
              if (latestSessionSnapshot) {
                callbacks.setActiveCrawlSession?.(latestSessionSnapshot);
                callbacks.setWebImportData?.(latestSessionSnapshot);
                flushSession(latestSessionSnapshot);
              }
            }, 1200);
          }

          callbacks.setWebImportStatus?.(`Chapter ${stats.current || stats.completedCount || allChapters.length}/${currentTotal}: ${(newChapterObj.title || '').substring(0, 32)}…`);
          callbacks.onChapterDone?.(newChapterObj, allChapters, stats);
        }
      });

      // Flush any pending save immediately upon completion/pause
      if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
      if (latestSessionSnapshot) {
        flushSession(latestSessionSnapshot);
      }

      const ctrl = window.WebNovelImporter?.getActiveController?.();
      if (ctrl?.isPaused) {
        callbacks.setIsFetchingPaused?.(true);
        callbacks.setIsFetchingUrl?.(false);
        const finalSession = latestSessionSnapshot || (data?.chapters ? { ...targetSession, chapters: data.chapters } : null);
        if (finalSession) {
          callbacks.setActiveCrawlSession?.(finalSession);
          callbacks.setWebImportData?.(finalSession);
          flushSession(finalSession);
        }
        if (ctrl.circuitBreakerTripped) {
          callbacks.setWebImportError?.({
            message: ctrl.pauseReason || '3 consecutive chapters unreachable. Crawl auto-paused to protect novel data.',
            isCircuitBreaker: true,
            targetUrl: resolvedUrl,
            partialCount: finalSession?.chapters?.length || initialChapters.length,
            totalCount: finalSession?.totalChapterCount || 0
          });
        }
        safeToast(callbacks, ctrl.pauseReason ? `⏸ ${ctrl.pauseReason}` : `⏸ Fetch paused. ${finalSession?.chapters?.length || data?.chapters?.length || initialChapters.length} chapters saved to Library.`, 'info');
        callbacks.onPaused?.(finalSession, ctrl);
        return finalSession;
      }

      if (ctrl?.isCancelled) {
        callbacks.setIsFetchingPaused?.(false);
        callbacks.setIsFetchingUrl?.(false);
        if (latestSessionSnapshot) {
          callbacks.setActiveCrawlSession?.(latestSessionSnapshot);
          callbacks.setWebImportData?.(latestSessionSnapshot);
        }
        safeToast(callbacks, `✕ Fetch cancelled. Progress preserved in Library.`, 'warning');
        callbacks.onCancelled?.(latestSessionSnapshot);
        return latestSessionSnapshot;
      }

      // Fetch completed or returned
      if (data) {
        const totalExpected = data.totalChapterCount || (data.chapterList ? data.chapterList.length : (data.chapters ? data.chapters.length : (latestSessionSnapshot?.totalChapterCount || targetSession?.totalChapterCount || 0)));
        const isActuallyFinished = totalExpected > 0 ? (data.chapters.length >= totalExpected || (data.chapterList && data.chapterList.length > 0 && data.chapters.length >= data.chapterList.length)) : true;

        data.id = novelId;
        data.sourceUrl = data.sourceUrl || resolvedUrl;
        const completedCustomTitle = targetSession?.customTitle ||
          safeGetCustomTitle(options, resolvedUrl) ||
          safeGetCustomTitle(options, novelId) ||
          targetSession?.title;
        if (completedCustomTitle) {
          data.title = completedCustomTitle;
          data.customTitle = completedCustomTitle;
        }
        data.cover = data.cover || targetSession?.cover || latestSessionSnapshot?.cover || '';
        const existingFolder = safeGetNovelFolderOptions(options, data);
        data.folderTreeUri = data.folderTreeUri || targetSession?.folderTreeUri || latestSessionSnapshot?.folderTreeUri || existingFolder.treeUri || '';
        data.folderPath = data.folderPath || targetSession?.folderPath || latestSessionSnapshot?.folderPath || existingFolder.folderPath || '';
        data.isIncomplete = !isActuallyFinished;
        data.totalChapterCount = totalExpected || data.chapters.length;
        callbacks.setWebImportData?.(data);
        flushSession(data);

        if (isActuallyFinished) {
          try {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('gemini_active_crawl_session');
          } catch (e) {}
          callbacks.setActiveCrawlSession?.(null);
          callbacks.setIsFetchingPaused?.(false);
          callbacks.setIsFetchingUrl?.(false);
          callbacks.setWebImportStatus?.('');
          callbacks.setWebImportError?.(null);
          safeToast(callbacks, `Imported "${data.title}" — ${data.chapters.length} chapters! 🎉`, 'success');
          try {
            window.NativeBridge?.clearProgressNotification?.(true);
            window.NativeBridge?.showCompletionNotification?.('Novel Import Complete! 📥', `Imported "${data.title}" (${data.chapters.length} chapters).`);
          } catch (e) {}
          if (autoExportEpub && data.chapters && data.chapters.length > 0) {
            if (typeof callbacks.exportCleanLnoriEpub === 'function') {
              callbacks.exportCleanLnoriEpub(data);
            } else {
              exportCleanLnoriEpub(data, options, callbacks);
            }
          }
          callbacks.onComplete?.(data);
          return data;
        } else {
          // Not finished (e.g. rate limit, partial pause, or network interrupt) — retain active session
          try {
            window.NativeBridge?.clearProgressNotification?.(false);
            window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', `Saved ${data.chapters.length}/${totalExpected} chapters. Tap to resume.`);
          } catch (e) {}
          const partialSession = {
            ...latestSessionSnapshot,
            ...data,
            id: novelId,
            isIncomplete: true,
            totalChapterCount: totalExpected,
            completedCount: data.chapters.length,
            folderTreeUri: data.folderTreeUri || latestSessionSnapshot?.folderTreeUri || existingFolder.treeUri || '',
            folderPath: data.folderPath || latestSessionSnapshot?.folderPath || existingFolder.folderPath || ''
          };
          callbacks.setActiveCrawlSession?.(partialSession);
          flushSession(partialSession);
          callbacks.setIsFetchingPaused?.(true);
          callbacks.setIsFetchingUrl?.(false);
          safeToast(callbacks, `⚠️ Partial import: Saved ${data.chapters.length}/${totalExpected} chapters. Click "Resume Fetch" to continue.`, 'warning');
          callbacks.onPaused?.(partialSession, ctrl);
          return partialSession;
        }
      }
    } catch (err) {
      if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
      if (latestSessionSnapshot) flushSession(latestSessionSnapshot);

      const ctrl = window.WebNovelImporter?.getActiveController?.();
      try { window.NativeBridge?.clearProgressNotification?.(false); } catch (e) {}
      if (ctrl?.isPaused) {
        callbacks.setIsFetchingPaused?.(true);
        try { window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', 'Fetch paused. Progress saved.'); } catch (e) {}
        safeToast(callbacks, ctrl?.pauseReason || 'Fetch paused. Progress saved.', 'info');
        callbacks.onPaused?.(latestSessionSnapshot, ctrl);
      } else if (ctrl?.isCancelled) {
        callbacks.setIsFetchingPaused?.(false);
        safeToast(callbacks, 'Fetch cancelled.', 'warning');
        callbacks.onCancelled?.(latestSessionSnapshot);
      } else {
        console.error('Fetch novel error:', err);
        const partialCount = latestSessionSnapshot?.chapters?.length || targetSession?.chapters?.length || 0;
        const totalCount = latestSessionSnapshot?.totalChapterCount || targetSession?.totalChapterCount || 0;
        if (partialCount > 0) {
          callbacks.setIsFetchingPaused?.(true);
        }
        const errObj = {
          message: err.message || 'Failed to fetch remote novel.',
          isCloudflare: !!err.isCloudflare,
          challengeType: err.challengeType || null,
          targetUrl: err.targetUrl || resolvedUrl,
          partialCount,
          totalCount
        };
        callbacks.setWebImportError?.(errObj);
        if (err.isCloudflare) {
          safeToast(callbacks, '🛡️ Remote site has Cloudflare verification active.', 'warning');
        } else {
          safeToast(callbacks, 'Failed to fetch URL: ' + err.message, 'error');
        }
        callbacks.onError?.(err, errObj);
      }
    } finally {
      callbacks.setIsFetchingUrl?.(false);
      const ctrl = window.WebNovelImporter?.getActiveController?.();
      if (!ctrl?.isPaused) {
        try { window.NativeBridge?.releaseWakeLock?.(); } catch (e) {}
      }
    }
  }

  /**
   * Pause the active crawl
   */
  function pauseCrawl(callbacks = {}) {
    try { window.WebNovelImporter?.pause?.(); } catch (e) {}
    try {
      window.NativeBridge?.clearProgressNotification?.(false);
      window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', 'Fetch paused. Current progress saved.');
      window.NativeBridge?.releaseWakeLock?.();
    } catch (e) {}
    callbacks.setIsFetchingPaused?.(true);
    callbacks.setIsFetchingUrl?.(false);
    callbacks.setWebImportStatus?.('Pausing… progress saved.');
    safeToast(callbacks, 'Pausing fetch… current progress has been saved.', 'info');
    callbacks.onPaused?.();
  }

  /**
   * Cancel the active crawl
   */
  function cancelCrawl(callbacks = {}) {
    try { window.WebNovelImporter?.cancel?.(); } catch (e) {}
    try {
      window.NativeBridge?.clearProgressNotification?.(false);
      window.NativeBridge?.releaseWakeLock?.();
    } catch (e) {}
    callbacks.setIsFetchingPaused?.(false);
    callbacks.setIsFetchingUrl?.(false);
    callbacks.setWebImportStatus?.('');
    safeToast(callbacks, 'Cancelled fetch. Progress has been preserved in Library.', 'warning');
    callbacks.onCancelled?.();
  }

  /**
   * Export clean EPUB directly from downloaded novel chapters
   */
  async function exportCleanLnoriEpub(novelData, options = {}, callbacks = {}) {
    if (!novelData || !novelData.chapters || novelData.chapters.length === 0) {
      safeToast(callbacks, 'No chapters downloaded to export.', 'warning');
      return;
    }
    const chs = novelData.chapters;
    const novelTitle = safeCleanBookTitle(options, novelData.title, chs).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
    const novelAuthor = safeCleanBookAuthor(options, novelData.author).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
    const coverUrl = novelData.cover || (chs[0]?.content?.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/)?.[1]) || (chs[0]?.text?.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/)?.[1]) || '';

    try {
      const opts = safeGetEpubOptions(options, { novelId: novelData.id || novelData.sourceUrl || novelTitle });
      opts.hierarchicalToc = true;
      opts.cleanWebArtifacts = true;
      opts.includeImages = true;
      if (coverUrl) opts.coverUrl = coverUrl;

      const generateEpubFn = options.generateEpubFromChapters || (typeof window !== 'undefined' ? window.generateEpubFromChapters : null);
      if (typeof generateEpubFn !== 'function') {
        throw new Error('EPUB generator (generateEpubFromChapters) is not available.');
      }

      const blob = await generateEpubFn(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
        callbacks.setEpubPackagingModal?.({ title: novelTitle, status, pct, elapsed });
        callbacks.onProgress?.(status, pct, elapsed);
      }, opts);

      const isInc = novelData.isIncomplete || (novelData.totalChapterCount && chs.length < novelData.totalChapterCount);
      const epubFileName = safeGetEpubFileName(options, novelTitle, chs.length, isInc);
      const folderOpts = safeGetNovelFolderOptions(options, novelData);

      const saveUniversalBlobFn = options.saveUniversalBlob || (typeof window !== 'undefined' ? window.saveUniversalBlob : null);
      if (typeof saveUniversalBlobFn !== 'function') {
        throw new Error('saveUniversalBlob is not available.');
      }

      await saveUniversalBlobFn(blob, epubFileName, 'application/epub+zip', false, folderOpts);
      safeToast(callbacks, `Clean Lnori EPUB downloaded! (${chs.length} chapters)`, 'success');
      callbacks.onSuccess?.(blob, epubFileName);
      return blob;
    } catch (e) {
      safeToast(callbacks, 'EPUB export error: ' + e.message, 'error');
      callbacks.onError?.(e);
    } finally {
      callbacks.setEpubPackagingModal?.(null);
    }
  }

  /**
   * 1-Click clean EPUB direct downloader
   */
  async function directEpubDownload({ targetUrl, webImportUrl, currentData, history, options = {}, callbacks = {} } = {}) {
    const url = (targetUrl || webImportUrl || options.webImportUrl || '').trim();
    if (!url) {
      safeToast(callbacks, 'Please enter an Lnori URL', 'warning');
      return;
    }
    if (url !== webImportUrl) {
      callbacks.setWebImportUrl?.(url);
    }

    // Automatically ensure illustrations are enabled
    callbacks.setScrapeImages?.(true);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('scrapeImages', 'true'); } catch (e) {}
    if (typeof window !== 'undefined') window.__scrapeImages = true;
    callbacks.setEpubIncludeImages?.(true);
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('epubIncludeImages', 'true'); } catch (e) {}

    // Check if novel data is already loaded in memory
    const activeSession = options.activeCrawlSession;
    const importData = options.webImportData;
    const memoryData = currentData || ((activeSession?.chapters?.length >= (importData?.chapters?.length || 0)) ? activeSession : (importData || activeSession));

    if (memoryData && memoryData.chapters && memoryData.chapters.length > 0 &&
        (!url || memoryData.sourceUrl === url || memoryData.url === url || url === webImportUrl)) {
      safeToast(callbacks, 'Novel already loaded — packaging clean EPUB…', 'info');
      if (typeof callbacks.exportCleanLnoriEpub === 'function') {
        return callbacks.exportCleanLnoriEpub(memoryData);
      }
      return exportCleanLnoriEpub(memoryData, options, callbacks);
    }

    // Check if novel already exists in Library history
    const historyList = history || options.webImportHistory || [];
    const existingInHistory = historyList.find(h => (h.sourceUrl && h.sourceUrl === url) || (h.url && h.url === url));
    if (existingInHistory) {
      try {
        const loadFullNovelFn = options.loadFullNovel || callbacks.loadFullNovel || (typeof window !== 'undefined' ? window.LibraryEngine?.loadFullNovel : null);
        const full = (typeof loadFullNovelFn === 'function') ? await loadFullNovelFn(existingInHistory) : existingInHistory;
        if (full && full.chapters && full.chapters.length > 0 && !full.isIncomplete) {
          safeToast(callbacks, 'Loaded from Library — packaging clean EPUB…', 'info');
          if (typeof callbacks.exportCleanLnoriEpub === 'function') {
            return callbacks.exportCleanLnoriEpub(full);
          }
          return exportCleanLnoriEpub(full, options, callbacks);
        }
      } catch (_) {}
    }

    safeToast(callbacks, 'Starting 1-click download for clean Lnori EPUB…', 'info');
    if (typeof callbacks.handleStartFetch === 'function') {
      return callbacks.handleStartFetch(false, null, true, url);
    }
    return startCrawl({
      targetUrl: url,
      isResume: false,
      resumeSessionData: null,
      autoExportEpub: true,
      options,
      callbacks
    });
  }

  /**
   * Resume crawl from an existing session or novel object
   */
  async function resumeCrawlFromSession(sessionOrNovel, options = {}, callbacks = {}) {
    if (typeof options === 'object' && options && !callbacks && (options.setActiveTab || options.handleStartFetch)) {
      callbacks = options;
      options = {};
    }
    callbacks.setActiveTab?.('web_importer');
    let full = sessionOrNovel;
    if (!full.rawChapters && !full.chapters) {
      const loadFullNovelFn = options.loadFullNovel || callbacks.loadFullNovel || (typeof window !== 'undefined' ? window.LibraryEngine?.loadFullNovel : null);
      if (typeof loadFullNovelFn === 'function') {
        const loaded = await loadFullNovelFn(sessionOrNovel);
        if (loaded) full = loaded;
      }
    }
    const chs = full.rawChapters || full.chapters || [];
    const sessionData = {
      id: full.id,
      url: full.sourceUrl || full.url,
      sourceUrl: full.sourceUrl || full.url,
      title: full.title,
      author: full.author,
      summary: full.summary,
      chapters: chs,
      chapterList: full.chapterList || [],
      totalChapterCount: full.totalChapterCount || full.chapterList?.length || chs.length,
      isIncomplete: true
    };
    callbacks.setWebImportUrl?.(sessionData.url || '');
    callbacks.setActiveCrawlSession?.(sessionData);
    callbacks.setWebImportData?.(sessionData);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gemini_active_crawl_session', JSON.stringify(sessionData));
      }
    } catch (e) {}

    if (typeof callbacks.handleStartFetch === 'function') {
      return callbacks.handleStartFetch(true, sessionData);
    }
    return startCrawl({
      targetUrl: sessionData.url,
      isResume: true,
      resumeSessionData: sessionData,
      autoExportEpub: false,
      options,
      callbacks
    });
  }

  /**
   * Dismiss the active crawl session
   */
  function dismissCrawlSession(callbacks = {}) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('gemini_active_crawl_session');
      }
    } catch (e) {}
    callbacks.setActiveCrawlSession?.(null);
    callbacks.setIsFetchingPaused?.(false);
    safeToast(callbacks, 'Crawl session dismissed.', 'info');
    callbacks.onDismissed?.();
  }

  /**
   * Unified Novel Search across scrapers and plugin registries
   */
  async function searchNovels(queryOrUrl, sourceOverride = 'all', callbacks = {}) {
    const target = (queryOrUrl || '').trim();
    if (!target || target === 'https://novelbuddy.me' || target === 'https://www.royalroad.com' || target === 'https://novelfire.net' || target === 'https://lnori.com/' || target === 'https://lnori.com' || target === 'https://witchculttranslation.com/table-of-content/') {
      safeToast(callbacks, 'Please enter a novel title or keyword to search', 'warning');
      return [];
    }

    // If user pasted a direct novel chapter or book URL, initiate crawl directly
    if (/^https?:\/\//i.test(target) && !target.includes('/search') && !target.includes('?q=') && !target.includes('?s=')) {
      safeToast(callbacks, 'Direct novel URL detected. Starting novel fetch…', 'info');
      if (typeof callbacks?.onDirectUrl === 'function') {
        return callbacks.onDirectUrl(target);
      }
      return [];
    }

    if (sourceOverride === 'all') {
      callbacks?.onFilterFallback?.('all');
    }

    callbacks?.onStart?.();
    safeToast(callbacks, 'Searching novel sources and installed plugins…', 'info');

    try {
      const q = target.replace(/^https?:\/\/[^\/]+\/(?:search|fictions\/search)\?[^=]+=/i, '');

      // Search scraper and plugins in parallel
      const scraperPromise = (async () => {
        if (typeof window !== 'undefined' && window.WebNovelImporter?.searchNovels && sourceOverride !== 'plugins_only') {
          try {
            return await window.WebNovelImporter.searchNovels(q || target, sourceOverride || 'all');
          } catch (sErr) {
            console.warn('[searchNovels] Scraper search error:', sErr);
          }
        }
        return [];
      })();

      const pluginPromise = (async () => {
        const reg = (typeof window !== 'undefined' ? (window.sourceRegistry || window.SourceRegistry) : null) || global.sourceRegistry || global.SourceRegistry;
        if (reg) {
          try {
            const normOverride = (sourceOverride || 'all').replace(/[\s\-_]+/g, '').toLowerCase();
            if (normOverride !== 'all' && normOverride !== 'plugins' && normOverride !== 'plugins_only') {
              if (typeof reg.searchPlugin === 'function') {
                return await reg.searchPlugin(sourceOverride, q || target);
              }
            } else if (typeof reg.searchAll === 'function') {
              return await reg.searchAll(q || target);
            }
          } catch (pErr) {
            console.warn('[searchNovels] Plugin search failed:', pErr);
          }
        }
        return [];
      })();

      const [scraperResults, rawPluginResults] = await Promise.all([scraperPromise, pluginPromise]);

      let results = Array.isArray(scraperResults) ? [...scraperResults] : [];

      if (Array.isArray(rawPluginResults) && rawPluginResults.length > 0) {
        const existingUrls = new Set(results.map(r => (r.url || '').replace(/\/$/, '')));
        for (const p of rawPluginResults) {
          const pUrl = (p.url || p.path || '').replace(/\/$/, '');
          if (pUrl && !existingUrls.has(pUrl)) {
            existingUrls.add(pUrl);
            results.push({
              id: p.id || pUrl,
              title: p.title || p.name || 'Untitled Novel',
              author: p.author || '',
              url: p.url || p.path,
              cover: p.cover || '',
              summary: p.summary || '',
              chapters: p.chapters || '',
              rating: p.rating || '',
              status: p.status || '',
              source: p.source || 'Source Plugin'
            });
          }
        }
      }

      // If a specific source was requested but yielded 0 results, fall back to searching all sources
      if (results.length === 0 && sourceOverride !== 'all' && sourceOverride !== 'plugins_only') {
        try {
          if (typeof window !== 'undefined' && window.WebNovelImporter?.searchNovels) {
            const fallbackResults = await window.WebNovelImporter.searchNovels(q || target, 'all');
            if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
              results = fallbackResults;
              callbacks?.onFilterFallback?.('all');
              safeToast(callbacks, `No results on ${sourceOverride}, but found ${results.length} across other sources!`, 'info');
            }
          }
        } catch (_) {}
      }

      callbacks?.onResults?.(results);
      if (results.length === 0) {
        safeToast(callbacks, `No novels found matching "${target}". Try different keywords or browse installed plugins!`, 'info');
      } else {
        safeToast(callbacks, `Found ${results.length} novels across supported sources & plugins!`, 'success');
      }
      return results;
    } catch (e) {
      callbacks?.onError?.(e);
      safeToast(callbacks, 'Novel search error: ' + (e?.message || e), 'error');
      return [];
    } finally {
      callbacks?.onEnd?.();
    }
  }

  /**
   * Computes a sorting weight for a chapter based on its title and original index.
   */
  function parseChapterWeight(titleOrRaw, idx = 0) {
    const raw = (typeof titleOrRaw === 'string' ? titleOrRaw : (titleOrRaw?.title || '')).trim().toLowerCase();
    const safeIdx = typeof idx === 'number' ? idx : 0;

    // 1. Prologue / Preface / Intro / 序
    if (/^(prologue|preface|intro|introduction|foreword|序章|序)\b/i.test(raw)) {
      return -999999 + safeIdx * 0.001;
    }

    // 2. Epilogue / Afterword / 终章 / 尾声 (only if not an explicitly numbered chapter)
    if (/^(epilogue|afterword|postscript|终章|尾声|后记)\b/i.test(raw) && !/chapter\s*\d+/i.test(raw)) {
      return 999999 + safeIdx * 0.001;
    }

    // 3. Volume + Chapter match: "Volume 2 Chapter 15", "Vol. 1 - Ch. 5", "v3:c10"
    const volChMatch = raw.match(/(?:volume|vol|v)\.?\s*(\d+)\s*[-_.:\s]\s*(?:chapter|ch|c)\.?\s*(\d+(?:\.\d+)?)/i) ||
                       raw.match(/vol(?:ume)?\.?\s*(\d+).*?ch(?:apter)?\.?\s*(\d+(?:\.\d+)?)/i);
    if (volChMatch) {
      return parseFloat(volChMatch[1]) * 100000 + parseFloat(volChMatch[2]);
    }

    // 4. Volume match alone or Volume + Chapter detected separately
    const volMatch = raw.match(/(?:volume|vol\.?|book|v)\s*(\d+)/i);

    // 5. Standard chapter match: "Chapter 123", "Ch. 123", "c123", "第123章", or leading number
    const chMatch = raw.match(/(?:chapter|ch\.?|ep\.?|episode|c|part)\s*(\d+(?:\.\d+)?)/i) ||
                    raw.match(/第\s*(\d+)\s*[章话話集]/) ||
                    raw.match(/^(\d+(?:\.\d+)?)\b/);

    if (chMatch) {
      const chVal = parseFloat(chMatch[1]);
      if (volMatch) {
        return parseFloat(volMatch[1]) * 100000 + chVal;
      }
      return chVal;
    }

    if (volMatch) {
      return parseFloat(volMatch[1]) * 100000;
    }

    // If no explicit number, keep original relative index
    return safeIdx;
  }

  /**
   * Sorts chapters chronologically using parseChapterWeight and original index fallback.
   */
  function autoSortChapters(chapters) {
    if (!Array.isArray(chapters) || chapters.length <= 1) {
      return Array.isArray(chapters) ? [...chapters] : [];
    }

    const chaptersWithWeights = chapters.map((c, originalIdx) => ({
      chapter: c,
      weight: parseChapterWeight(typeof c === 'string' ? c : (c?.title || ''), originalIdx),
      originalIdx
    }));

    chaptersWithWeights.sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.originalIdx - b.originalIdx;
    });

    return chaptersWithWeights.map(x => x.chapter);
  }

  /**
   * Reverses chapter order (1 <-> N).
   */
  function reverseChapters(chapters) {
    if (!Array.isArray(chapters)) return [];
    return [...chapters].reverse();
  }

  /**
   * Uses Gemini or DeepSeek AI to intelligently analyze chapter titles and reading order.
   */
  async function aiReorderChapters({
    chapters,
    provider = 'gemini',
    apiKey,
    model = 'gemini-2.5-flash',
    customModel,
    useCustomModel,
    customDeepseekModel,
    useCustomDeepseekModel,
    callbacks = {}
  } = {}) {
    if (!Array.isArray(chapters) || chapters.length <= 1) {
      return { success: true, chapters: Array.isArray(chapters) ? [...chapters] : [] };
    }

    if (!apiKey) {
      throw new Error('API key is required for AI Reorder.');
    }

    const fetchFn = (typeof window !== 'undefined' && window.fetchRetry) ? window.fetchRetry : fetch;

    try {
      const titleItems = chapters.map((c, i) => {
        const t = (typeof c === 'string' ? c : (c?.title || `Chapter ${i + 1}`)).replace(/"/g, "'");
        return `${i}: "${t}"`;
      });
      const systemPrompt = "You are an expert novel editor and reading order analyzer. The user will provide a list of chapter titles with their 0-based indices from an imported web novel. Some chapters may be out of chronological reading order (such as a latest release teaser or side story placed at the top, or prologue out of place).\\n\\nOutput a valid JSON array of the original integer indices arranged in their proper, chronological reading order (from first chapter to last chapter).\\nInclude every single index from 0 to N-1 exactly once. Output ONLY the raw JSON array (e.g. [1, 2, 3, 0]), with NO extra commentary or markdown backticks.";
      const userPrompt = `Reorder these ${chapters.length} chapter titles into proper chronological reading order:\\n${titleItems.join('\\n')}`;

      let jsonStr = '';
      if (provider === 'deepseek') {
        const actualDeepseekModel = (useCustomDeepseekModel && customDeepseekModel) ? customDeepseekModel : 'deepseek-chat';
        const r = await fetchFn('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: actualDeepseekModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false
          })
        });
        if (!r.ok) {
          const b = await r.text().catch(() => '');
          throw new Error(`API error ${r.status}: ${b.substring(0, 150)}`);
        }
        const j = await r.json();
        jsonStr = j.choices?.[0]?.message?.content || '';
      } else {
        const actualGeminiModel = (useCustomModel && customModel) ? customModel : (model || 'gemini-2.5-flash');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualGeminiModel}:generateContent?key=${apiKey}`;
        const r = await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192
            }
          })
        });
        if (!r.ok) {
          const b = await r.text().catch(() => '');
          throw new Error(`Gemini API error ${r.status}: ${b.substring(0, 150)}`);
        }
        const j = await r.json();
        const candidateParts = j?.candidates?.[0]?.content?.parts || [];
        const actualParts = candidateParts.filter(p => !p.thought);
        jsonStr = actualParts.length > 0 ? actualParts.map(p => p.text || '').join('') : candidateParts.map(p => p.text || '').join('');
      }

      const cleanJson = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
      const matchArray = cleanJson.match(/\[[\s\d,]+\]/);
      let orderArray = null;
      if (matchArray) {
        try { orderArray = JSON.parse(matchArray[0]); } catch(e) {}
      }
      if (!orderArray) {
        const bracketMatch = cleanJson.match(/\[([^\]]+)\]/);
        if (bracketMatch) {
          const nums = bracketMatch[1].match(/\d+/g);
          if (nums) orderArray = nums.map(Number);
        }
      }
      if (!orderArray || !Array.isArray(orderArray)) {
        throw new Error('Could not parse index array from AI response.');
      }

      if (orderArray.length !== chapters.length) {
        throw new Error(`AI returned ${orderArray.length} items (expected ${chapters.length}). Using Auto-Sort.`);
      }

      const indexSet = new Set(orderArray);
      if (indexSet.size !== chapters.length) {
        throw new Error('AI returned duplicate indices. Using Auto-Sort.');
      }

      const reordered = orderArray.map(idx => chapters[idx]);
      return { success: true, chapters: reordered };
    } catch (aiErr) {
      if (callbacks.onError) callbacks.onError(aiErr);
      const fallback = autoSortChapters(chapters);
      return { success: false, fallback: true, error: aiErr, chapters: fallback };
    }
  }

  const Controller = {
    startFetch(params = {}) {
      const {
        isResume = false,
        resumeSessionData = null,
        autoExportEpub = false,
        overrideUrl = null,
        targetUrl = null,
        options = {},
        callbacks = {}
      } = params;
      return startCrawl({
        targetUrl: overrideUrl || targetUrl,
        isResume,
        resumeSessionData,
        autoExportEpub,
        options,
        callbacks
      });
    },

    pauseFetch(params = {}) {
      const cbs = params.callbacks || params;
      return pauseCrawl(cbs);
    },

    cancelFetch(params = {}) {
      const cbs = params.callbacks || params;
      return cancelCrawl(cbs);
    },

    directEpubDownload(params = {}) {
      return directEpubDownload(params);
    },

    resumeCrawl(sessionOrNovelOrParams, options = {}, callbacks = {}) {
      if (sessionOrNovelOrParams && typeof sessionOrNovelOrParams === 'object' && ('sessionOrNovel' in sessionOrNovelOrParams || 'novel' in sessionOrNovelOrParams || 'session' in sessionOrNovelOrParams)) {
        const novel = sessionOrNovelOrParams.sessionOrNovel || sessionOrNovelOrParams.novel || sessionOrNovelOrParams.session;
        const opts = sessionOrNovelOrParams.options || options;
        const cbs = sessionOrNovelOrParams.callbacks || callbacks;
        return resumeCrawlFromSession(novel, opts, cbs);
      }
      return resumeCrawlFromSession(sessionOrNovelOrParams, options, callbacks);
    },

    dismissCrawl(params = {}) {
      const cbs = params.callbacks || params;
      return dismissCrawlSession(cbs);
    }
  };

  const WebNovelCrawlerEngine = {
    searchNovels,
    startCrawl,
    pauseCrawl,
    cancelCrawl,
    exportCleanLnoriEpub,
    directEpubDownload,
    resumeCrawlFromSession,
    dismissCrawlSession,
    parseChapterWeight,
    autoSortChapters,
    reverseChapters,
    aiReorderChapters,
    Controller
  };

  global.WebNovelCrawlerEngine = WebNovelCrawlerEngine;
  if (typeof window !== 'undefined') {
    window.WebNovelCrawlerEngine = WebNovelCrawlerEngine;
    window.WebNovelCrawlerEngine.Controller = Controller;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebNovelCrawlerEngine;
  }
})(typeof window !== 'undefined' ? window : this);
