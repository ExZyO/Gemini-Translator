/**
 * Gemini EPUB Translator - Moon+ Reader Continuity, Folder Sync & OPDS Server Engine
 * Module: moon_reader_engine.js
 * 
 * Provides:
 * - Persistent folder binding and tree URI resolution for Moon+ Reader Pro automated file replacement
 * - Local OPDS 1.2 / Atom Catalog XML generation for direct device-to-reader wireless sync
 * - Native Android OPDS background server control (start/stop/status)
 * - Ongoing EPUB Continuation:
 *   - Search across web scrapers and 278+ source extensions
 *   - Remote TOC inspection and chapter count scanning
 *   - In-place EPUB chapter appending preserving original fonts, covers, and styles
 */

(function(window) {
  'use strict';

  const MoonReaderEngine = {
    /**
     * Resolves folder options (treeUri, subDir, folderPath) for a given novel
     */
    getNovelFolderOptions(novel) {
      if (!novel) return {};
      try {
        const mappingStore = JSON.parse(localStorage.getItem('gemini_novel_folder_mappings') || '{}');
        const titleKey = (novel.title || '').trim().toLowerCase();
        const idKey = novel.id || '';
        const urlKey = novel.sourceUrl || novel.url || '';
        const mapped = (idKey && mappingStore[idKey]) || (titleKey && mappingStore[titleKey]) || (urlKey && mappingStore[urlKey]);

        const metaList = JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
        const meta = metaList.find(m => (novel.id && m.id === novel.id) || (m.title && novel.title && m.title.trim().toLowerCase() === novel.title.trim().toLowerCase()));
        const treeUri = novel.folderTreeUri || mapped?.treeUri || mapped?.folderTreeUri || meta?.folderTreeUri || '';
        const folderPath = novel.folderPath || mapped?.folderPath || mapped?.subDir || meta?.folderPath || '';
        return {
          treeUri,
          folderTreeUri: treeUri,
          subDir: folderPath,
          folderPath
        };
      } catch (e) {
        return {};
      }
    },

    /**
     * Updates persistent folder mapping records across localStorage and IndexedDB
     */
    async updateNovelFolderRecord(novel, treeUri, displayPath, callbacks = {}) {
      const novelId = typeof novel === 'object' ? (novel.id || '') : (novel || '');
      const novelTitle = typeof novel === 'object' ? (novel.title || '') : (novel || '');
      const novelUrl = typeof novel === 'object' ? (novel.sourceUrl || novel.url || '') : '';
      const normTitle = (novelTitle || '').trim().toLowerCase();

      // 1. Dedicated persistent folder mapping dictionary
      try {
        const mappingStore = JSON.parse(localStorage.getItem('gemini_novel_folder_mappings') || '{}');
        const entry = { treeUri, folderTreeUri: treeUri, folderPath: displayPath, subDir: displayPath };
        if (novelId) mappingStore[novelId] = entry;
        if (normTitle) mappingStore[normTitle] = entry;
        if (novelUrl) mappingStore[novelUrl] = entry;
        localStorage.setItem('gemini_novel_folder_mappings', JSON.stringify(mappingStore));
      } catch (e) {}

      // 2. Metadata list in localStorage
      try {
        const metaList = JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
        let matched = false;
        const updatedMeta = metaList.map(m => {
          const mId = m.id || '';
          const mTitle = (m.title || '').trim().toLowerCase();
          if ((novelId && mId === novelId) || (normTitle && mTitle === normTitle)) {
            matched = true;
            return { ...m, folderTreeUri: treeUri, folderPath: displayPath };
          }
          return m;
        });
        if (!matched && typeof novel === 'object' && novel) {
          updatedMeta.unshift({ ...novel, folderTreeUri: treeUri, folderPath: displayPath });
        }
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedMeta));
      } catch (e) {}

      // 3. Update IndexedDB full record
      if (window.GeminiNovelDB) {
        try {
          const all = await window.GeminiNovelDB.getAllNovels();
          const full = (all || []).find(n => (novelId && n.id === novelId) || (normTitle && (n.title || '').trim().toLowerCase() === normTitle));
          if (full) {
            await window.GeminiNovelDB.saveNovel({ ...full, folderTreeUri: treeUri, folderPath: displayPath });
          } else if (typeof novel === 'object' && novel && (novel.chapters || novel.rawChapters)) {
            await window.GeminiNovelDB.saveNovel({ ...novel, folderTreeUri: treeUri, folderPath: displayPath });
          }
        } catch (e) {}
      }

      // 4. Trigger caller state callbacks if provided
      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory({ novelId, normTitle, treeUri, displayPath, novel });
      }
      if (typeof callbacks.onUpdateActiveCrawlSession === 'function') {
        callbacks.onUpdateActiveCrawlSession({ novelId, normTitle, treeUri, displayPath });
      }
      if (typeof callbacks.onUpdateWebImportData === 'function') {
        callbacks.onUpdateWebImportData({ novelId, normTitle, treeUri, displayPath });
      }
      if (typeof callbacks.onUpdateActiveNovelRecord === 'function') {
        callbacks.onUpdateActiveNovelRecord({ novelId, normTitle, treeUri, displayPath });
      }

      return { treeUri, folderPath: displayPath };
    },

    /**
     * Opens folder picker dialog (Native Android or browser prompt) and saves the mapping
     */
    async chooseNovelFolder(novel, callbacks = {}) {
      if (!novel) return null;
      if (window.NativeBridge && window.NativeBridge.chooseFolder) {
        const res = await window.NativeBridge.chooseFolder();
        if (res && res.treeUri) {
          await this.updateNovelFolderRecord(novel, res.treeUri, res.displayPath, callbacks);
          return res;
        }
        return null;
      }
      const sanitizeFn = window.sanitizeFilename || (s => s);
      const cur = novel.folderPath || ('Books/' + sanitizeFn(novel.title || 'Novel'));
      const p = window.prompt('Enter folder path for "' + (novel.title || 'Novel') + '" (e.g. Books/' + sanitizeFn(novel.title || 'Novel') + '):', cur);
      if (p !== null && p.trim()) {
        const res = { treeUri: '', displayPath: p.trim() };
        await this.updateNovelFolderRecord(novel, '', p.trim(), callbacks);
        return res;
      }
      return null;
    },

    /**
     * Coordinates novel folder binding across state setters and storage
     */
    async bindNovelFolder(novel, treeUri, displayPath, stateSetters = {}) {
      const { setWebImportHistory, setActiveCrawlSession, setWebImportData, setActiveNovelRecord } = stateSetters || {};
      return await this.updateNovelFolderRecord(novel, treeUri, displayPath, {
        onUpdateHistory: ({ novelId, normTitle, novel: n }) => {
          if (typeof setWebImportHistory === 'function') {
            setWebImportHistory(prev => {
              const list = prev || [];
              const exists = list.some(item => (novelId && item.id === novelId) || (normTitle && (item.title || '').trim().toLowerCase() === normTitle));
              if (exists) {
                return list.map(item => {
                  if ((novelId && item.id === novelId) || (normTitle && (item.title || '').trim().toLowerCase() === normTitle)) {
                    return { ...item, folderTreeUri: treeUri, folderPath: displayPath };
                  }
                  return item;
                });
              }
              if (typeof n === 'object' && n) {
                return [{ ...n, folderTreeUri: treeUri, folderPath: displayPath }, ...list];
              }
              return list;
            });
          }
        },
        onUpdateActiveCrawlSession: ({ novelId, normTitle }) => {
          if (typeof setActiveCrawlSession === 'function') {
            setActiveCrawlSession(prev => {
              if (!prev) return prev;
              const matchId = novelId && prev.id === novelId;
              const matchTitle = normTitle && (prev.title || '').trim().toLowerCase() === normTitle;
              if (matchId || matchTitle || !novelId) {
                const updated = { ...prev, folderTreeUri: treeUri, folderPath: displayPath };
                try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(updated)); } catch(e) {}
                return updated;
              }
              return prev;
            });
          }
        },
        onUpdateWebImportData: ({ novelId, normTitle }) => {
          if (typeof setWebImportData === 'function') {
            setWebImportData(prev => {
              if (!prev) return prev;
              const matchId = novelId && prev.id === novelId;
              const matchTitle = normTitle && (prev.title || '').trim().toLowerCase() === normTitle;
              if (matchId || matchTitle || !novelId) {
                return { ...prev, folderTreeUri: treeUri, folderPath: displayPath };
              }
              return prev;
            });
          }
        },
        onUpdateActiveNovelRecord: ({ novelId, normTitle }) => {
          if (typeof setActiveNovelRecord === 'function') {
            setActiveNovelRecord(prev => {
              if (!prev) return prev;
              const matchId = novelId && prev.id === novelId;
              const matchTitle = normTitle && (prev.title || '').trim().toLowerCase() === normTitle;
              if (matchId || matchTitle || !novelId) {
                return { ...prev, folderTreeUri: treeUri, folderPath: displayPath };
              }
              return prev;
            });
          }
        }
      });
    },

    /**
     * Coordinates folder selection dialog, storage, and UI toast feedback
     */
    async handleSetNovelFolder(novel, { toast, setWebImportHistory } = {}) {
      if (!novel) return null;
      try {
        const res = await this.chooseNovelFolder(novel, {
          onUpdateHistory: ({ novelId, normTitle }) => {
            if (typeof setWebImportHistory === 'function') {
              setWebImportHistory(prev => (prev || []).map(item => (item.id === novelId || (item.title || '').trim().toLowerCase() === normTitle) ? { ...item, folderTreeUri: res.treeUri, folderPath: res.displayPath } : item));
            }
          }
        });
        if (res && typeof toast === 'function') {
          toast(`📁 Saved folder path for "${novel.title}" (${res.displayPath})! Future EPUBs will overwrite here.`, 'success');
        }
        return res;
      } catch (e) {
        if (e.message && !e.message.toLowerCase().includes('cancel')) {
          if (typeof toast === 'function') {
            toast('Folder setup: ' + e.message, 'error');
          }
        }
        return null;
      }
    },

    /**
     * Formats an OPDS 1.2 Atom Feed XML from an array of novel records
     */
    generateOpdsFeedXml(novels) {
      const escapeXmlStr = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const now = new Date().toISOString();
      const cleanTitleFn = window.cleanBookTitle || ((t) => t || 'Novel');
      const cleanAuthorFn = window.cleanBookAuthor || ((a) => a || 'Author');
      const getFileNameFn = window.getEpubFileName || ((t, c) => `${t || 'Novel'}.epub`);

      let entries = '';
      (novels || []).forEach(n => {
        const cleanTitle = cleanTitleFn(n.title).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        const cleanAuthor = cleanAuthorFn(n.author).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        const epubFileName = getFileNameFn(cleanTitle, n.chapterCount || (n.chapters || []).length, false);
        const uuid = 'urn:uuid:' + (n.id || cleanTitle.toLowerCase().replace(/\s+/g, '-'));
        const updated = n.timestamp ? new Date(n.timestamp).toISOString() : now;
        entries += `
  <entry>
    <title>${escapeXmlStr(cleanTitle)}</title>
    <id>${escapeXmlStr(uuid)}</id>
    <updated>${updated}</updated>
    <author><name>${escapeXmlStr(cleanAuthor)}</name></author>
    <summary>${escapeXmlStr(n.summary || `${n.chapterCount || (n.chapters || []).length} chapters`)}</summary>
    <link rel="http://opds-spec.org/acquisition" href="/download/${encodeURIComponent(epubFileName)}" type="application/epub+zip" title="Download EPUB"/>
    ${n.cover ? `<link rel="http://opds-spec.org/image" href="${escapeXmlStr(n.cover)}" type="image/jpeg"/>` : ''}
  </entry>`;
      });

      return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/" xmlns:opds="http://opds-spec.org/2010/catalog">
  <id>urn:uuid:gemini-translator-library</id>
  <title>Gemini Translator Library</title>
  <updated>${now}</updated>
  <author><name>Gemini Translator</name></author>
  <link rel="self" href="/opds" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  <link rel="start" href="/opds" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  ${entries}
</feed>`;
    },

    /**
     * Pushes current library catalog XML to NativeBridge OPDS server
     */
    syncOpdsCatalogToNative(novelsList) {
      try {
        if (window.NativeBridge && typeof window.NativeBridge.updateOpdsCatalog === 'function') {
          const xml = this.generateOpdsFeedXml(novelsList);
          window.NativeBridge.updateOpdsCatalog(xml);
        }
      } catch (e) {
        console.warn('[MoonReaderEngine] OPDS sync error:', e);
      }
    },

    /**
     * Toggles native OPDS server state
     */
    async toggleOpdsServer(currentlyRunning, novelsList) {
      if (currentlyRunning) {
        await window.NativeBridge?.stopOpdsServer?.();
        return { running: false };
      }
      this.syncOpdsCatalogToNative(novelsList);
      const res = await window.NativeBridge?.startOpdsServer?.(8080);
      if (res && res.running) {
        return {
          running: true,
          localUrl: res.localUrl || 'http://127.0.0.1:8080/opds',
          wifiUrl: res.wifiUrl || ''
        };
      }
      throw new Error('Could not start OPDS server on device.');
    },

    /**
     * UI coordinator for toggling OPDS server with toast notifications and state setters
     */
    async toggleOpdsServerUI(opdsRunning, { toast, setOpdsRunning, setOpdsUrl, setOpdsWifiUrl, webImportHistory } = {}) {
      try {
        const res = await this.toggleOpdsServer(opdsRunning, webImportHistory);
        if (typeof setOpdsRunning === 'function') setOpdsRunning(res.running);
        if (res.running) {
          if (res.localUrl && typeof setOpdsUrl === 'function') setOpdsUrl(res.localUrl);
          if (res.wifiUrl && typeof setOpdsWifiUrl === 'function') setOpdsWifiUrl(res.wifiUrl);
          if (typeof toast === 'function') {
            toast('Moon+ Reader OPDS Feed online! 📡 (' + (res.localUrl || 'port 8080') + ')', 'success');
          }
        } else {
          if (typeof toast === 'function') {
            toast('Moon+ Reader OPDS Feed stopped.', 'info');
          }
        }
        return res;
      } catch (e) {
        if (typeof toast === 'function') {
          toast('OPDS Error: ' + (e.message || e), 'error');
        }
        throw e;
      }
    },

    /**
     * Searches both built-in scrapers and extension plugins for continuation sources
     */
    async searchContinuationSources(query) {
      const cleanQuery = (query || '').trim();
      if (!cleanQuery) return [];
      const results = [];
      const seenUrls = new Set();

      const addItems = (items) => {
        if (!Array.isArray(items)) return;
        for (const p of items) {
          const u = (p.url || p.path || '').replace(/\/$/, '');
          if (u && !seenUrls.has(u)) {
            seenUrls.add(u);
            results.push({
              id: p.id || u,
              title: p.title || p.name || cleanQuery,
              author: p.author || '',
              url: p.url || p.path,
              cover: p.cover || '',
              summary: p.summary || '',
              chapters: p.chapters || '',
              source: p.source || 'Online Source'
            });
          }
        }
      };

      // 1. Run built-in scrapers and installed source plugins in parallel with fast 5s timeouts
      const scraperPromise = (async () => {
        if (window.WebNovelImporter?.searchNovels) {
          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Scraper timeout')), 5000));
            const scraperResults = await Promise.race([
              window.WebNovelImporter.searchNovels(cleanQuery, 'all'),
              timeoutPromise
            ]);
            addItems(scraperResults);
          } catch (e) {
            console.warn('[MoonReaderEngine] Scraper search error or timeout:', e);
          }
        }
      })();

      const pluginPromise = (async () => {
        const reg = window.sourceRegistry || window.SourceRegistry;
        if (reg && typeof reg.searchAll === 'function') {
          try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Plugin timeout')), 5000));
            const pluginResults = await Promise.race([
              reg.searchAll(cleanQuery),
              timeoutPromise
            ]);
            addItems(pluginResults);
          } catch (e) {
            console.warn('[MoonReaderEngine] Plugin search error or timeout:', e);
          }
        }
      })();

      await Promise.allSettled([scraperPromise, pluginPromise]);

      // 2. Rank exact title matches and entries with covers first
      const qLower = cleanQuery.toLowerCase();
      results.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aExact = aTitle === qLower ? 3 : (aTitle.startsWith(qLower) ? 2 : (aTitle.includes(qLower) ? 1 : 0));
        const bExact = bTitle === qLower ? 3 : (bTitle.startsWith(qLower) ? 2 : (bTitle.includes(qLower) ? 1 : 0));
        if (bExact !== aExact) return bExact - aExact;
        const aCover = a.cover ? 1 : 0;
        const bCover = b.cover ? 1 : 0;
        return bCover - aCover;
      });

      return results;
    },

    /**
     * Scans remote TOC to discover latest online chapter count
     */
    async scanContinuationToc(targetUrl) {
      let cleanUrl = (targetUrl || '').trim();
      if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
        throw new Error('Please enter a valid web novel source URL.');
      }
      // Normalize chapter URLs back to base novel URL for TOC inspection
      cleanUrl = cleanUrl.replace(/\/chapter[-_/\d].*$/i, '').replace(/\/chapters\/?$/i, '');
      if (!window.WebNovelImporter?.importUrl) {
        throw new Error('Web Novel Importer is not loaded.');
      }

      const remote = await window.WebNovelImporter.importUrl(cleanUrl, () => {}, { tocOnly: true });
      const totalOnline = (remote && typeof remote.totalChapterCount === 'number')
        ? remote.totalChapterCount
        : (remote?.chapterList ? remote.chapterList.length : (remote?.chapters ? remote.chapters.length : 0));

      return {
        totalOnlineCount: totalOnline || 0,
        chapterList: remote?.chapterList || []
      };
    },

    /**
     * Fetches new chapter range and packages in-place continuation EPUB
     */
    async executeContinuation(config, callbacks = {}) {
      const {
        title,
        author,
        cover,
        uuid,
        chapters,
        existingCount,
        sourceUrl,
        startChapter,
        endChapter,
        totalOnlineCount,
        file,
        originalZip,
        originalFileName,
        originalTitle,
        folderOptions
      } = config;

      if (!sourceUrl) throw new Error('Source URL is required to fetch new chapters.');

      const start = parseInt(startChapter, 10) || (existingCount + 1);
      const end = parseInt(endChapter, 10) || start;
      if (start > end) {
        throw new Error('Start chapter cannot be greater than end chapter.');
      }

      const startTime = Date.now();
      const getElapsed = () => {
        const sec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return (m > 0 ? `${m}m ` : '') + `${s}s`;
      };

      if (callbacks.onProgress) callbacks.onProgress('Connecting to online source…', 5, '0s');

      // 1. Fetch only requested chapter range
      const baseSourceUrl = (sourceUrl || '').trim().replace(/\/chapter[-_/\d].*$/i, '').replace(/\/chapters\/?$/i, '');
      const remoteResult = await window.WebNovelImporter.importUrl(baseSourceUrl || sourceUrl, (msg, pct) => {
        if (callbacks.onProgress) {
          callbacks.onProgress(msg || 'Downloading new chapters…', pct || 20, getElapsed());
        }
      }, {
        chapterRange: { start, end }
      });

      const newFetchedChapters = (remoteResult?.chapters && remoteResult.chapters.length > 0)
        ? remoteResult.chapters
        : ((remoteResult?.downloadedChapters && remoteResult.downloadedChapters.length > 0)
          ? remoteResult.downloadedChapters
          : (remoteResult?.rawChapters || []));
      if (newFetchedChapters.length === 0) {
        throw new Error('No new chapters could be retrieved from the source.');
      }

      // 2. Merge original chapters with newly fetched chapters based on story chapter numbers
      let hasParsedNumbers = false;
      const originalKeep = [];
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const chTitle = ch.title || '';
        const m = chTitle.match(/(?:chapter|ch\.?|ep\.?|episode|part)\s*(\d+(?:\.\d+)?)/i)
               || chTitle.match(/第\s*(\d+)\s*[章话話集]/)
               || chTitle.match(/^(\d+(?:\.\d+)?)\b/);
        if (m) {
          hasParsedNumbers = true;
          const num = Math.floor(parseFloat(m[1]));
          if (num < start) {
            originalKeep.push(ch);
          }
        } else {
          // Keep preface / front-matter without story chapter numbers if we haven't reached start count
          if (originalKeep.length < start) {
            originalKeep.push(ch);
          }
        }
      }
      if (!hasParsedNumbers) {
        const keepCount = Math.min(chapters.length, Math.max(0, start - 1));
        originalKeep.push(...chapters.slice(0, keepCount));
      }
      const cleanChFn = (typeof cleanChapterTitle === 'function') ? cleanChapterTitle : ((typeof window !== 'undefined' && window.cleanChapterTitle) ? window.cleanChapterTitle : ((t, n) => String(t || '').replace(/\s*[-|–—:•~]\s*(?:Novel\s*Fire|Novelfire).*$/i, '').trim()));
      const mergedChapters = [
        ...originalKeep.map(c => ({ title: cleanChFn(c.title, title), text: c.text || c.content, content: c.text || c.content })),
        ...newFetchedChapters.map(c => ({ title: cleanChFn(c.title, title), text: c.text || c.content, content: c.text || c.content }))
      ];

      if (callbacks.onProgress) {
        callbacks.onProgress('Packaging chapters into EPUB…', 85, getElapsed());
      }

      // 3. Package EPUB: in-place append if original source exists, else fresh generation
      let epubBlob = null;
      const originalSource = file || originalZip;

      if (originalSource && typeof window.appendChaptersToExistingEpub === 'function') {
        epubBlob = await window.appendChaptersToExistingEpub(
          originalSource,
          newFetchedChapters,
          { startChapter: start },
          (status, pct) => {
            if (callbacks.onProgress) {
              callbacks.onProgress(status, Math.round(85 + (pct * 0.14)), getElapsed());
            }
          }
        );
      } else if (typeof window.generateEpubFromChapters === 'function') {
        epubBlob = await window.generateEpubFromChapters(
          mergedChapters,
          title,
          author || 'Author',
          'en',
          (status, pct, elapsed) => {
            if (callbacks.onProgress) {
              callbacks.onProgress(status, Math.round(85 + (pct * 0.14)), elapsed);
            }
          },
          {
            uuid: uuid || undefined,
            coverUrl: cover || undefined,
            sourceUrl
          }
        );
      } else {
        throw new Error('EPUB generator engine is not loaded.');
      }

      // 4. Save to target folder or downloads
      const isInc = totalOnlineCount ? mergedChapters.length < totalOnlineCount : false;
      const getFileNameFn = window.getEpubFileName || ((t, c, inc) => `${t || 'Novel'}.epub`);
      // Retain exact original filename if linked/known to ensure Moon+ Reader Pro in-place continuity
      const originalName = originalFileName || file?.name;
      const outFileName = originalName || getFileNameFn(title, mergedChapters.length, isInc);
      const folderOpts = folderOptions || this.getNovelFolderOptions({ id: uuid, title, sourceUrl });
      const safeFolderOpts = { ...folderOpts, suppressModal: true };

      if (typeof window.saveUniversalBlob === 'function') {
        await window.saveUniversalBlob(epubBlob, outFileName, 'application/epub+zip', false, safeFolderOpts);
      }

      return {
        epubBlob,
        mergedChapters,
        newFetchedCount: newFetchedChapters.length,
        isInc,
        outFileName,
        folderOpts,
        totalChapterCount: Math.max(mergedChapters.length, totalOnlineCount || mergedChapters.length)
      };
    },

    /**
     * Detects highest story chapter number from chapter titles
     */
    detectHighestChapterNumber(chapters = []) {
      if (!Array.isArray(chapters) || chapters.length === 0) return 0;
      let highest = 0;
      for (let i = chapters.length - 1; i >= 0; i--) {
        const title = chapters[i]?.title || '';
        const m = title.match(/(?:chapter|ch\.?|ep\.?|episode|part)\s*(\d+(?:\.\d+)?)/i)
               || title.match(/第\s*(\d+)\s*[章话話集]/)
               || title.match(/^(\d+(?:\.\d+)?)\b/);
        if (m) {
          const num = Math.floor(parseFloat(m[1]));
          if (num > highest && num < 100000) {
            highest = num;
          }
        }
      }
      return highest;
    },

    /**
     * Inspects an ongoing EPUB file and constructs the continuation modal state
     */
    async inspectOngoingEpubFile(file, options = {}, callbacks = {}) {
      if (!file) return null;
      if (!file.name.toLowerCase().endsWith('.epub')) {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast('Please select a valid .epub file.', 'warning');
        }
        return null;
      }
      try {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`Inspecting "${file.name}"…`, 'info');
        }
        const readEpubFn = options.readEpub || (typeof window !== 'undefined' ? window.readEpub : null);
        if (typeof readEpubFn !== 'function') {
          throw new Error('EPUB reader engine is not loaded.');
        }
        const epub = await readEpubFn(file);
        if (!epub || !epub.chapters || epub.chapters.length === 0) {
          if (typeof callbacks.toast === 'function') {
            callbacks.toast('No readable chapters found in this EPUB.', 'warning');
          }
          return null;
        }

        const cleanTitle = (epub.title || file.name.replace(/\.epub$/i, '')).replace(/\s*-\s*\d+\s*chs?$/i, '').trim();
        const existingCount = epub.chapters.length;
        const highestStoryChapter = this.detectHighestChapterNumber(epub.chapters);
        const suggestedStart = (highestStoryChapter > 0 ? highestStoryChapter : existingCount) + 1;
        const detectedSource = epub.sourceUrl || '';
        const fOpts = this.getNovelFolderOptions({ id: epub.uuid, title: cleanTitle, sourceUrl: detectedSource });

        const modalState = {
          isOpen: true,
          file,
          originalFileName: file.name,
          originalTitle: epub.title || file.name.replace(/\.epub$/i, ''),
          title: cleanTitle,
          searchQuery: cleanTitle,
          author: epub.author || 'Author',
          cover: epub.cover || '',
          uuid: epub.uuid || '',
          chapters: epub.chapters,
          existingCount,
          highestStoryChapter,
          sourceUrl: detectedSource,
          selectedSource: null,
          continuationSources: [],
          isSearchingSources: true,
          showSourceSwitcher: false,
          customUrlMode: false,
          folderOptions: fOpts,
          onlineToc: null,
          totalOnlineCount: 0,
          isScanningToc: false,
          startChapter: suggestedStart,
          endChapter: suggestedStart,
          isFetching: false,
          progress: { status: '', pct: 0, elapsed: '' }
        };

        if (typeof callbacks.onModalState === 'function') {
          callbacks.onModalState(modalState);
        }

        if (typeof callbacks.onSearchSources === 'function') {
          callbacks.onSearchSources(cleanTitle);
        }

        if (detectedSource && /^https?:\/\//i.test(detectedSource) && typeof callbacks.onScanToc === 'function') {
          callbacks.onScanToc(detectedSource, existingCount);
        }

        return modalState;
      } catch (err) {
        console.error('[MoonReaderEngine] Failed to parse EPUB for continuation:', err);
        if (typeof callbacks.toast === 'function') {
          callbacks.toast('Failed to inspect EPUB: ' + err.message, 'error');
        }
        return null;
      }
    },

    /**
     * Opens continuation modal for an existing novel in the library
     */
    async openContinuationForNovel(novelItem, loadFullNovelFn, options = {}, callbacks = {}) {
      try {
        const loadFn = typeof loadFullNovelFn === 'function'
          ? loadFullNovelFn
          : (options.loadFullNovel || (window.LibraryEngine?.loadFullNovel ? window.LibraryEngine.loadFullNovel.bind(window.LibraryEngine) : null));

        const full = loadFn ? await loadFn(novelItem) : novelItem;
        if (!full) {
          if (typeof callbacks.toast === 'function') {
            callbacks.toast('Novel data not found in library.', 'error');
          }
          return null;
        }

        let chs = full.translatedChapters || full.rawChapters || full.chapters || [];
        let epubMeta = null;

        const readEpubFn = options.readEpub || (typeof window !== 'undefined' ? window.readEpub : null);

        // CRITICAL FIX: If full.epubBlob exists, parse the authoritative chapters directly from the EPUB container!
        // This guarantees 100% parity with selecting the EPUB file from device storage and never misses chapters.
        if (full.epubBlob && !full.isEdited && typeof readEpubFn === 'function') {
          try {
            epubMeta = await readEpubFn(full.epubBlob);
            if (epubMeta && epubMeta.chapters && epubMeta.chapters.length > 0) {
              chs = epubMeta.chapters;
            }
          } catch (err) {
            console.warn('[MoonReaderEngine] Could not parse full.epubBlob with readEpub, falling back to stored chapters:', err);
          }
        }

        if (chs.length === 0) {
          if (typeof callbacks.toast === 'function') {
            callbacks.toast('No chapters found in this novel.', 'warning');
          }
          return null;
        }

        const cleanTitle = (epubMeta?.title || full.title || 'Novel').replace(/\s*-\s*\d+\s*chs?$/i, '').trim();
        const existingCount = chs.length;
        const highestStoryChapter = this.detectHighestChapterNumber(chs);
        const suggestedStart = (highestStoryChapter > 0 ? highestStoryChapter : existingCount) + 1;
        const detectedSource = epubMeta?.sourceUrl || full.sourceUrl || full.url || '';
        const fOpts = this.getNovelFolderOptions(full || novelItem);

        const modalState = {
          isOpen: true,
          file: full.epubBlob || null,
          originalFileName: full.fileName || (full.title ? `${full.title}.epub` : 'Novel.epub'),
          originalTitle: epubMeta?.title || full.title || 'Novel',
          title: cleanTitle,
          searchQuery: cleanTitle,
          author: epubMeta?.author || full.author || 'Author',
          cover: epubMeta?.cover || full.cover || '',
          uuid: epubMeta?.uuid || full.uuid || full.id || '',
          chapters: chs,
          existingCount,
          highestStoryChapter,
          sourceUrl: detectedSource,
          selectedSource: null,
          continuationSources: [],
          isSearchingSources: true,
          showSourceSwitcher: false,
          customUrlMode: false,
          folderOptions: fOpts,
          onlineToc: null,
          totalOnlineCount: 0,
          isScanningToc: false,
          startChapter: suggestedStart,
          endChapter: suggestedStart,
          isFetching: false,
          progress: { status: '', pct: 0, elapsed: '' }
        };

        if (typeof callbacks.onModalState === 'function') {
          callbacks.onModalState(modalState);
        }

        if (typeof callbacks.onSearchSources === 'function') {
          callbacks.onSearchSources(cleanTitle);
        }

        if (detectedSource && /^https?:\/\//i.test(detectedSource) && typeof callbacks.onScanToc === 'function') {
          callbacks.onScanToc(detectedSource, existingCount);
        }

        return modalState;
      } catch (e) {
        console.error('[MoonReaderEngine] Error opening continuation:', e);
        if (typeof callbacks.toast === 'function') {
          callbacks.toast('Error opening continuation: ' + e.message, 'error');
        }
        return null;
      }
    },

    /**
     * Inspects a Moon+ Reader Pro .mrexpt backup file content
     * Returns metadata about the original book title, path, and entries
     */
    inspectMrexpt(content) {
      if (!content || typeof content !== 'string') return null;
      const lines = content.split(/\r?\n/);
      let entryCount = 0;
      let bookId = '';
      let oldTitle = '';
      let oldFilePath = '';
      let inEntry = false;
      let entryLineIdx = 0;
      const sampleHighlights = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '#') {
          entryCount++;
          inEntry = true;
          entryLineIdx = 0;
          continue;
        }
        if (!inEntry) {
          if (i === 0 && line.trim()) {
            bookId = line.trim();
          }
          continue;
        }
        if (inEntry) {
          if (entryLineIdx === 1 && !oldTitle) {
            oldTitle = line.trim();
          } else if (entryLineIdx === 2 && !oldFilePath) {
            oldFilePath = line.trim();
          } else if (entryLineIdx === 12) {
            if (line.trim() && sampleHighlights.length < 5) {
              sampleHighlights.push(line.trim());
            }
          }
          entryLineIdx++;
        }
      }

      return {
        entryCount,
        bookId,
        oldTitle,
        oldFilePath,
        sampleHighlights
      };
    },

    /**
     * Extracts target book ID, title, and file path from a 1-bookmark sample export
     */
    extractTemplateFromMrexpt(content) {
      if (!content || typeof content !== 'string') return null;
      const inspected = this.inspectMrexpt(content);
      if (!inspected) return null;
      return {
        bookId: inspected.bookId || '',
        title: inspected.oldTitle || '',
        filePath: inspected.oldFilePath || ''
      };
    },

    /**
     * Migrates a Moon+ Reader Pro .mrexpt backup file content to match a new book title, book ID, and/or file path.
     * Preserves 100% of bookmark coordinates, notes, colors, offsets, and timestamps.
     */
    migrateMrexpt(content, { newBookId, newTitle, newFilePath } = {}) {
      if (!content || typeof content !== 'string') return '';
      const lines = content.split(/\r?\n/);
      const out = [];
      let inEntry = false;
      let entryLineIdx = 0;
      let headerProcessed = false;

      let resolvedFilePath = (newFilePath || '').trim().replace(/\\/g, '/');

      // If resolvedFilePath is just a file name (no slash), find existing directory prefix from file
      if (resolvedFilePath && !resolvedFilePath.includes('/')) {
        let existingDir = '';
        let scanInEntry = false;
        let scanIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === '#') {
            scanInEntry = true;
            scanIdx = 0;
            continue;
          }
          if (scanInEntry) {
            if (scanIdx === 2) {
              const p = lines[i].trim().replace(/\\/g, '/');
              if (p.includes('/')) {
                existingDir = p.substring(0, p.lastIndexOf('/') + 1);
              }
              break;
            }
            scanIdx++;
          }
        }
        if (existingDir) {
          resolvedFilePath = existingDir + resolvedFilePath;
        }
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '#') {
          inEntry = true;
          entryLineIdx = 0;
          out.push(line);
          continue;
        }
        if (!inEntry) {
          if (!headerProcessed && i === 0 && newBookId) {
            out.push(String(newBookId).trim());
            headerProcessed = true;
          } else {
            out.push(line);
          }
          continue;
        }
        if (inEntry) {
          if (entryLineIdx === 1 && newTitle && newTitle.trim()) {
            out.push(newTitle.trim());
          } else if (entryLineIdx === 2 && resolvedFilePath) {
            out.push(resolvedFilePath);
          } else if (entryLineIdx === 3 && resolvedFilePath) {
            out.push(resolvedFilePath.toLowerCase());
          } else {
            out.push(line);
          }
          entryLineIdx++;
        } else {
          out.push(line);
        }
      }

      return out.join('\n');
    },

    /**
     * Workflow handlers for Ongoing EPUB Continuation UI
     */
    Continuation: {
      async handleSelectOngoingEpubFile(e, options = {}, callbacks = {}) {
        const file = (e && e.target && e.target.files) ? e.target.files[0] : e;
        if (!file) return null;
        const readEpub = options.readEpub || (typeof window !== 'undefined' ? window.readEpub : null);
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : null);
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const onSearch = callbacks.handleSearchContinuationSources || callbacks.onSearchSources || ((q) => this.handleSearchContinuationSources(q, options, callbacks));
        const onScan = callbacks.handleScanContinuationToc || callbacks.onScanToc || ((u, count) => this.handleScanContinuationToc(u, { ...options, existingCount: count }, callbacks));

        const modalState = await MoonReaderEngine.inspectOngoingEpubFile(file, { readEpub }, {
          toast,
          onModalState: setOngoingEpubModal,
          onSearchSources: onSearch,
          onScanToc: onScan
        });
        if (modalState && typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(modalState);
        }
        if (e && e.target && 'value' in e.target) {
          e.target.value = '';
        }
        return modalState;
      },

      async handleOpenContinuationForNovel(novelItem, options = {}, callbacks = {}) {
        if (!novelItem) return null;
        const readEpub = options.readEpub || (typeof window !== 'undefined' ? window.readEpub : null);
        const loadFullNovel = options.loadFullNovel || (typeof window !== 'undefined' ? (window.loadFullNovel || window.LibraryEngine?.loadFullNovel) : null);
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : null);
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const onSearch = callbacks.handleSearchContinuationSources || callbacks.onSearchSources || ((q) => this.handleSearchContinuationSources(q, options, callbacks));
        const onScan = callbacks.handleScanContinuationToc || callbacks.onScanToc || ((u, count) => this.handleScanContinuationToc(u, { ...options, existingCount: count }, callbacks));

        const modalState = await MoonReaderEngine.openContinuationForNovel(novelItem, loadFullNovel, { readEpub }, {
          toast,
          onModalState: setOngoingEpubModal,
          onSearchSources: onSearch,
          onScanToc: onScan
        });
        if (modalState && typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(modalState);
        }
        return modalState;
      },

      async handleScanContinuationToc(url, options = {}, callbacks = {}) {
        const targetUrl = (url || options.url || options.sourceUrl || options.ongoingEpubModal?.sourceUrl || '').trim();
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : console.log);
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const existingCount = options.existingCount !== undefined ? options.existingCount : (options.ongoingEpubModal?.existingCount || 0);

        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
          if (typeof toast === 'function') toast('Please enter a valid web novel source URL.', 'warning');
          return null;
        }
        if (typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(prev => prev ? { ...prev, isScanningToc: true, sourceUrl: targetUrl } : null);
        }
        try {
          const { totalOnlineCount, chapterList } = await MoonReaderEngine.scanContinuationToc(targetUrl);
          if (!totalOnlineCount || totalOnlineCount === 0) {
            if (typeof toast === 'function') toast('Failed to retrieve online chapters from this URL.', 'warning');
            if (typeof setOngoingEpubModal === 'function') {
              setOngoingEpubModal(prev => prev ? { ...prev, isScanningToc: false } : null);
            }
            return null;
          }

          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => {
              if (!prev) return null;
              const curExisting = (prev.highestStoryChapter > 0 ? prev.highestStoryChapter : prev.existingCount) || existingCount || 0;
              const isUpToDate = curExisting >= totalOnlineCount;
              const start = isUpToDate ? totalOnlineCount : (curExisting + 1);
              return {
                ...prev,
                isScanningToc: false,
                onlineToc: chapterList || [],
                totalOnlineCount,
                startChapter: Math.max(1, Math.min(start, totalOnlineCount)),
                endChapter: Math.max(1, totalOnlineCount)
              };
            });
          }
          if (typeof toast === 'function') {
            const curExisting = (options.ongoingEpubModal?.highestStoryChapter > 0 ? options.ongoingEpubModal.highestStoryChapter : (options.ongoingEpubModal?.existingCount || existingCount)) || 0;
            if (curExisting >= totalOnlineCount) {
              toast(`Novel is already up to date! Found ${totalOnlineCount} online chapters.`, 'info');
            } else {
              toast(`Discovered ${totalOnlineCount} chapters online! (Ready to fetch from Ch. ${curExisting + 1})`, 'success');
            }
          }
          return { totalOnlineCount, chapterList };
        } catch (err) {
          console.error('Scan TOC error:', err);
          const isStillTarget = options.ongoingEpubModal ? (options.ongoingEpubModal.sourceUrl === targetUrl) : true;
          if (isStillTarget && err.name !== 'AbortError' && typeof toast === 'function') {
            toast('Failed to scan online source: ' + err.message, 'error');
          }
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => (prev && prev.sourceUrl === targetUrl) ? { ...prev, isScanningToc: false } : prev);
          }
          return null;
        }
      },

      async handleSearchContinuationSources(cleanTitle, options = {}, callbacks = {}) {
        const query = (cleanTitle || options.query || '').trim();
        if (!query) return [];
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        if (typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(prev => prev ? { ...prev, isSearchingSources: true, continuationSources: [] } : null);
        }
        try {
          const deduped = await MoonReaderEngine.searchContinuationSources(query);
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => {
              if (!prev) return null;
              return {
                ...prev,
                isSearchingSources: false,
                continuationSources: deduped
              };
            });
          }
          return deduped;
        } catch (err) {
          console.error('[handleSearchContinuationSources] Error:', err);
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => prev ? { ...prev, isSearchingSources: false } : null);
          }
          return [];
        }
      },

      async handleSelectContinuationSource(source, options = {}, callbacks = {}) {
        const targetUrl = source?.url || source?.path;
        if (!targetUrl) return;
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : console.log);
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const srcName = source?.source || source?.name || 'source';
        if (typeof toast === 'function') toast(`Switching to ${srcName}…`, 'info');
        if (typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(prev => prev ? {
            ...prev,
            selectedSource: source,
            sourceUrl: targetUrl,
            showSourceSwitcher: false,
            isScanningToc: false,
            isFetching: false
          } : null);
        }
        const onScan = callbacks.handleScanContinuationToc || callbacks.onScanToc || ((u, count) => this.handleScanContinuationToc(u, { ...options, existingCount: count }, callbacks));
        const count = options.existingCount !== undefined ? options.existingCount : options.ongoingEpubModal?.existingCount;
        await onScan(targetUrl, count);
      },

      async handleExecuteContinuation(options = {}, callbacks = {}) {
        const ongoingEpubModal = options.ongoingEpubModal || options;
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : console.log);
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const saveNovelToHistory = callbacks.saveNovelToHistory || (typeof window !== 'undefined' ? (window.saveNovelToHistory || window.LibraryEngine?.saveNovelToHistory) : null);

        if (!ongoingEpubModal || !ongoingEpubModal.sourceUrl) {
          if (typeof toast === 'function') toast('Source URL is required to fetch new chapters.', 'warning');
          return;
        }
        if (MoonReaderEngine._isContinuationExecuting || ongoingEpubModal.isFetching) {
          console.warn('[handleExecuteContinuation] Continuation already executing, ignoring duplicate call.');
          return;
        }
        MoonReaderEngine._isContinuationExecuting = true;

        if (typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(prev => prev ? {
            ...prev,
            isFetching: true,
            progress: { status: 'Connecting to online source…', pct: 5, elapsed: '0s' }
          } : null);
        }

        try {
          const result = await MoonReaderEngine.executeContinuation(ongoingEpubModal, {
            onProgress: (status, pct, elapsed) => {
              if (typeof setOngoingEpubModal === 'function') {
                setOngoingEpubModal(prev => prev ? {
                  ...prev,
                  progress: { status, pct, elapsed }
                } : null);
              }
            }
          });

          const { epubBlob, mergedChapters, isInc, folderOpts, totalChapterCount, newFetchedCount } = result;
          const { title, author, cover, uuid, sourceUrl } = ongoingEpubModal;

          // Save updated novel into library with epubBlob cached for preserved re-downloads
          if (typeof saveNovelToHistory === 'function') {
            await saveNovelToHistory({
              title,
              author,
              cover,
              uuid: uuid || '',
              sourceUrl,
              chapters: mergedChapters,
              totalChapterCount,
              isIncomplete: isInc,
              isEpub: true,
              epubBlob,
              fileName: result?.outFileName || (ongoingEpubModal.originalFileName || `${title}.epub`),
              folderOptions: folderOpts,
              folderPath: folderOpts?.folderPath || '',
              folderTreeUri: folderOpts?.treeUri || ''
            });
          }

          const finalFileName = result?.outFileName || (ongoingEpubModal.originalFileName || `${title}.epub`);
          const modalSetter = callbacks.setDownloadSuccessModal || (typeof window !== 'undefined' ? window.__setDownloadModal : null);
          if (typeof modalSetter === 'function') {
            modalSetter({
              fileName: finalFileName,
              title,
              newChaptersCount: newFetchedCount,
              totalChaptersCount: totalChapterCount,
              isContinuation: true
            });
          }

          if (typeof toast === 'function') {
            toast(`Updated "${title}"! Appended ${newFetchedCount} new chapters. Book ID and styling preserved for Moon+ Reader Pro!`, 'success');
          }
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(null);
          }
          return result;
        } catch (err) {
          console.error('Continuation error:', err);
          if (err.name !== 'AbortError' && typeof toast === 'function') {
            toast('Continuation failed: ' + err.message, 'error');
          }
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => prev ? { ...prev, isFetching: false } : null);
          }
        } finally {
          MoonReaderEngine._isContinuationExecuting = false;
        }
      }
    }
  };

  window.MoonReaderEngine = MoonReaderEngine;
  window.getNovelFolderOptions = MoonReaderEngine.getNovelFolderOptions;
  window.bindNovelFolder = MoonReaderEngine.bindNovelFolder.bind(MoonReaderEngine);
  window.handleSetNovelFolder = MoonReaderEngine.handleSetNovelFolder.bind(MoonReaderEngine);
  window.toggleOpdsServerUI = MoonReaderEngine.toggleOpdsServerUI.bind(MoonReaderEngine);
  window.inspectMrexpt = MoonReaderEngine.inspectMrexpt.bind(MoonReaderEngine);
  window.extractTemplateFromMrexpt = MoonReaderEngine.extractTemplateFromMrexpt.bind(MoonReaderEngine);
  window.migrateMrexpt = MoonReaderEngine.migrateMrexpt.bind(MoonReaderEngine);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoonReaderEngine;
  }
})(typeof window !== 'undefined' ? window : this);
