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
    async searchContinuationSources(query, onPartial = null) {
      const rawQuery = (query || '').trim();
      if (!rawQuery) return [];

      // 1. Direct novel or chapter URL entered into search box
      if (/^https?:\/\//i.test(rawQuery)) {
        const directItem = {
          id: rawQuery,
          title: 'Direct Novel Source',
          author: '',
          url: rawQuery,
          cover: '',
          summary: '',
          chapters: '',
          source: 'Direct Web URL'
        };
        if (typeof onPartial === 'function') {
          onPartial([directItem]);
        }
        return [directItem];
      }

      // 2. Intelligent title sanitization:
      // Strip .epub, bracketed/parenthetical volume tags, chapter counts, branding, and noise
      let cleanQuery = rawQuery
        .replace(/\.epub$/i, '')
        .replace(/\s*\[(?:vol(?:ume)?\.?\s*\d+|complete|ongoing|mtl|web\s*novel)[^\]]*\]/gi, '')
        .replace(/\s*\((?:vol(?:ume)?\.?\s*\d+|ch(?:apter)?\.?\s*\d+(?:-\d+)?|complete|ongoing|mtl)[^)]*\)/gi, '')
        .replace(/\s*-\s*(?:chapter|ch\.?|ep\.?)\s*\d+.*$/i, '')
        .replace(/\s*-\s*\d+\s*chs?$/i, '')
        .replace(/\s*[-|–—:•~]\s*(?:Novel\s*Fire(?:\.net)?|Novelfire(?:\.net)?|Lnori|Novel\s*Buddy|Lightnovelpub|Royal\s*Road)\s*$/i, '')
        .trim();
      if (!cleanQuery) cleanQuery = rawQuery;

      const results = [];
      const seenUrls = new Set();

      const sortResults = (list) => {
        const qLower = cleanQuery.toLowerCase();
        list.sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          const aExact = aTitle === qLower ? 3 : (aTitle.startsWith(qLower) ? 2 : (aTitle.includes(qLower) ? 1 : 0));
          const bExact = bTitle === qLower ? 3 : (bTitle.startsWith(qLower) ? 2 : (bTitle.includes(qLower) ? 1 : 0));
          if (bExact !== aExact) return bExact - aExact;
          const aCover = a.cover ? 1 : 0;
          const bCover = b.cover ? 1 : 0;
          return bCover - aCover;
        });
      };

      const emitPartial = () => {
        if (typeof onPartial === 'function' && results.length > 0) {
          try {
            const copy = [...results];
            sortResults(copy);
            onPartial(copy);
          } catch (_) {}
        }
      };

      const addItems = (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        let added = false;
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
              rating: p.rating || '',
              status: p.status || '',
              source: p.source || 'Online Source'
            });
            added = true;
          }
        }
        if (added) {
          emitPartial();
        }
      };

      // 3. Multi-tier search: Query CrawlerEngine, built-in scrapers, and source plugins in parallel with streaming
      const searchTasks = [];

      // Task A: WebNovelCrawlerEngine searchNovels with streaming
      if (typeof window !== 'undefined' && window.WebNovelCrawlerEngine?.searchNovels) {
        searchTasks.push(
          window.WebNovelCrawlerEngine.searchNovels(cleanQuery, 'all', {
            toast: () => {}, // silent background search
            onResults: (partial) => {
              addItems(partial);
            }
          }).then(res => {
            addItems(res);
          }).catch(err => {
            console.warn('[MoonReaderEngine] Crawler search error:', err);
          })
        );
      } else if (typeof window !== 'undefined' && window.WebNovelImporter?.searchNovels) {
        // Task B: Direct WebNovelImporter.searchNovels with streaming partials
        searchTasks.push(
          window.WebNovelImporter.searchNovels(cleanQuery, 'all', (partial) => {
            addItems(partial);
          }).then(res => {
            addItems(res);
          }).catch(err => {
            console.warn('[MoonReaderEngine] Importer search error:', err);
          })
        );
      }

      // Task C: Direct Source Registry extensions with streaming partials (in parallel with scrapers)
      const reg = (typeof window !== 'undefined' ? (window.sourceRegistry || window.SourceRegistry) : null);
      if (reg && typeof reg.searchAll === 'function') {
        searchTasks.push(
          reg.searchAll(cleanQuery, (partial) => {
            addItems(partial);
          }).then(res => {
            addItems(res);
          }).catch(err => {
            console.warn('[MoonReaderEngine] Plugin search error:', err);
          })
        );
      }

      if (searchTasks.length > 0) {
        await Promise.allSettled(searchTasks);
      }

      // 4. Secondary fallback: If 0 results and cleanQuery differed from rawQuery, try rawQuery
      if (results.length === 0 && cleanQuery !== rawQuery && rawQuery.length > 2) {
        if (typeof window !== 'undefined' && window.WebNovelImporter?.searchNovels) {
          try {
            const rawRes = await window.WebNovelImporter.searchNovels(rawQuery, 'all', (partial) => {
              addItems(partial);
            });
            addItems(rawRes);
          } catch (_) {}
        }
      }

      sortResults(results);
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
          novelId: full.id || novelItem.id || '',
          novelItem: full || novelItem,
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
     * Returns metadata about the original book title, path, entries, and sample notes
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
      const sampleNotes = [];

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
          } else if (entryLineIdx === 10) {
            if (line.trim() && sampleHighlights.length < 5) {
              sampleHighlights.push(line.trim());
            }
          } else if (entryLineIdx === 11) {
            if (line.trim() && sampleNotes.length < 5) {
              sampleNotes.push(line.trim());
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
        sampleHighlights,
        sampleNotes
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
        filePath: inspected.oldFilePath || '',
        entryCount: inspected.entryCount || 0
      };
    },

    /**
     * Normalizes a raw array of entry lines into a structured object with safe defaults
     */
    _normalizeParsedEntry(lines) {
      const rawLines = lines ? [...lines] : [];
      while (rawLines.length < 16) {
        rawLines.push('0');
      }
      return {
        id: rawLines[0] || '1',
        title: rawLines[1] || '',
        filePath: rawLines[2] || '',
        filePathLower: rawLines[3] || '',
        chapterIdx: parseInt(rawLines[4], 10) || 0,
        paraOffset: parseInt(rawLines[5], 10) || 0,
        charOffset: parseInt(rawLines[6], 10) || 0,
        type: parseInt(rawLines[7], 10) || 0,
        color: rawLines[8] || '0',
        timestamp: rawLines[9] || String(Date.now()),
        highlightText: rawLines[10] || '',
        noteText: rawLines[11] || '',
        extraLines: rawLines.slice(12),
        rawLines
      };
    },

    /**
     * Parses a Moon+ Reader Pro .mrexpt file into structured records
     */
    parseMrexptEntries(content) {
      if (!content || typeof content !== 'string') return null;
      const lines = content.split(/\r?\n/);
      let bookId = '';
      const headerLines = [];
      const entries = [];
      let inEntry = false;
      let curEntry = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '#') {
          if (curEntry) {
            entries.push(this._normalizeParsedEntry(curEntry));
          }
          curEntry = [];
          inEntry = true;
          continue;
        }
        if (!inEntry) {
          if (i === 0) {
            bookId = line.trim();
          } else {
            headerLines.push(line);
          }
          continue;
        }
        if (curEntry) {
          curEntry.push(line);
        }
      }
      if (curEntry) {
        entries.push(this._normalizeParsedEntry(curEntry));
      }

      return {
        bookId,
        headerLines,
        entries
      };
    },

    /**
     * Merges target phone book credentials with a master backup .mrexpt file.
     * Supports discarding dummy sample bookmarks, deduplicating overlapping notes,
     * re-stamping target book ID, title, and device file path.
     * Uses in-place rawLines replacement to preserve 100% of bookmark coordinates,
     * highlight offsets, colors, and extra metadata without row shifts.
     */
    mergeMrexpts(targetSampleText, masterBackupText, options = {}) {
      const {
        discardSampleBookmark,
        customBookId = '',
        customTitle = '',
        customFilePath = '',
        epubFileSize = null,
        renumberIds = true
      } = options;

      const targetData = targetSampleText ? this.parseMrexptEntries(targetSampleText) : null;
      const masterData = masterBackupText ? this.parseMrexptEntries(masterBackupText) : null;

      if (!masterData && !targetData) return null;

      const baseMaster = masterData || targetData;
      const baseTarget = targetData || masterData;

      // Smart dummy discard: Only discard if explicitly true, or auto-detect if exactly 1 entry in sample
      const shouldDiscardSample = (discardSampleBookmark !== undefined)
        ? Boolean(discardSampleBookmark)
        : Boolean(targetData && targetData.entries && targetData.entries.length === 1);

      let resolvedBookId = String(customBookId || (epubFileSize ? String(epubFileSize) : '') || baseTarget.bookId || baseMaster.bookId || '1').trim();
      let resolvedTitle = String(customTitle || (baseTarget.entries[0] && baseTarget.entries[0].title) || (baseMaster.entries[0] && baseMaster.entries[0].title) || 'Book.epub').trim().replace(/\s*\(\d+\)\.epub$/i, '.epub');
      let resolvedFilePath = String(customFilePath || (baseTarget.entries[0] && baseTarget.entries[0].filePath) || (baseMaster.entries[0] && baseMaster.entries[0].filePath) || '').trim().replace(/\\/g, '/');
      if (resolvedFilePath) {
        resolvedFilePath = resolvedFilePath.replace(/\s*\(\d+\)\.epub$/i, '.epub');
      }

      // Helper for unique bookmark identity
      const getEntryKey = (entry) => {
        const ch = entry.chapterIdx !== undefined ? entry.chapterIdx : 0;
        const p = entry.paraOffset !== undefined ? entry.paraOffset : 0;
        const c = entry.charOffset !== undefined ? entry.charOffset : 0;
        const textKey = (entry.highlightText || (entry.rawLines && entry.rawLines[10]) || '').trim().slice(0, 40).toLowerCase();
        return `${ch}:${p}:${c}:${textKey}`;
      };

      const entryMap = new Map();
      let dummyDiscardedCount = 0;

      // 1. Process targetData entries
      if (targetData && targetData.entries && !shouldDiscardSample) {
        for (const entry of targetData.entries) {
          const key = getEntryKey(entry);
          entryMap.set(key, { ...entry, rawLines: [...(entry.rawLines || [])] });
        }
      } else if (targetData && targetData.entries && shouldDiscardSample) {
        dummyDiscardedCount = targetData.entries.length;
      }

      // 2. Process masterData entries
      let masterAddedCount = 0;
      let notesMergedCount = 0;
      if (masterData && masterData.entries) {
        for (const entry of masterData.entries) {
          const key = getEntryKey(entry);
          if (entryMap.has(key)) {
            const existing = entryMap.get(key);
            if (!existing.noteText && entry.noteText) {
              existing.noteText = entry.noteText;
              notesMergedCount++;
            } else if (existing.noteText && entry.noteText && existing.noteText !== entry.noteText) {
              if (!existing.noteText.includes(entry.noteText)) {
                existing.noteText = `${existing.noteText}\n${entry.noteText}`;
                notesMergedCount++;
              }
            }
            if (Number(entry.timestamp) > Number(existing.timestamp)) {
              existing.timestamp = entry.timestamp;
            }
          } else {
            entryMap.set(key, { ...entry, rawLines: [...(entry.rawLines || [])] });
            masterAddedCount++;
          }
        }
      }

      // 3. Sort entries chronologically by story position
      const mergedEntries = Array.from(entryMap.values());
      mergedEntries.sort((a, b) => {
        if (a.chapterIdx !== b.chapterIdx) return a.chapterIdx - b.chapterIdx;
        if (a.paraOffset !== b.paraOffset) return a.paraOffset - b.paraOffset;
        return a.charOffset - b.charOffset;
      });

      // 4. Serialize back into standard .mrexpt format using safe in-place line preservation
      const finalLines = [];
      finalLines.push(resolvedBookId);
      finalLines.push(baseTarget.headerLines[0] || 'indent:false');
      finalLines.push(baseTarget.headerLines[1] || 'trim:false');

      for (let idx = 0; idx < mergedEntries.length; idx++) {
        const e = mergedEntries[idx];
        const assignedId = renumberIds ? String(idx + 1) : (e.id || String(idx + 1));
        finalLines.push('#');

        const eLines = e.rawLines ? [...e.rawLines] : [];
        while (eLines.length < 16) {
          eLines.push('0');
        }
        eLines[0] = assignedId;
        eLines[1] = resolvedTitle;
        eLines[2] = resolvedFilePath;
        eLines[3] = resolvedFilePath.toLowerCase();
        if (e.noteText && e.noteText !== eLines[11]) {
          eLines[11] = e.noteText;
        }

        for (let li = 0; li < eLines.length; li++) {
          finalLines.push(eLines[li]);
        }
      }

      return {
        mergedText: finalLines.join('\n'),
        totalEntries: mergedEntries.length,
        masterAddedCount,
        notesMergedCount,
        dummyDiscardedCount,
        resolvedBookId,
        resolvedTitle,
        resolvedFilePath
      };
    },

    /**
     * Direct alignment when the user only has the .epub file and master backup file.
     * Stamps the EPUB file name, title, byte size as book ID, and selected Android folder path across all entries.
     */
    alignMrexptToEpub({ epubFileName, epubTitle, deviceFolder, targetBookId, masterBackupText, epubFileSize } = {}) {
      if (!masterBackupText) return null;
      const cleanFileName = (epubFileName || 'Book.epub').replace(/\s*\(\d+\)\.epub$/i, '.epub').trim();
      const cleanTitle = (epubTitle || cleanFileName).replace(/\s*\(\d+\)\.epub$/i, '.epub').trim();
      const folder = (deviceFolder || '/storage/emulated/0/Books/').trim().replace(/\\/g, '/').replace(/\/?$/, '/');
      const customFilePath = folder + cleanFileName;

      let resolvedId = targetBookId;
      if (!resolvedId && epubFileSize) {
        resolvedId = String(epubFileSize);
      }

      return this.mergeMrexpts(null, masterBackupText, {
        discardSampleBookmark: false,
        customBookId: resolvedId || '',
        customTitle: cleanTitle,
        customFilePath,
        epubFileSize,
        renumberIds: true
      });
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

      // If resolvedFilePath is just a file name (no slash), find existing directory prefix or default
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
        resolvedFilePath = (existingDir || '/storage/emulated/0/Books/') + resolvedFilePath;
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

          // Auto-persist successfully verified website source to novel record
          const curNovel = options.ongoingEpubModal?.novelItem || options.novelItem || options.novel;
          if (curNovel && targetUrl && window.LibraryEngine?.assignNovelSourceUrl) {
            window.LibraryEngine.assignNovelSourceUrl(curNovel, targetUrl, {
              onUpdateHistory: callbacks.setWebImportHistory,
              onUpdateWebImportData: callbacks.setWebImportData,
              onUpdateActiveNovelRecord: callbacks.setActiveNovelRecord
            }).catch(() => {});
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
        const raw = (cleanTitle || options.query || '').trim();
        if (!raw) return [];
        const setOngoingEpubModal = callbacks.setOngoingEpubModal || callbacks.onModalState;
        const toast = callbacks.toast || (typeof window !== 'undefined' ? window.toast : null);

        // If direct novel URL entered into search box
        if (/^https?:\/\//i.test(raw)) {
          if (typeof toast === 'function') toast('Direct novel URL detected. Scanning table of contents…', 'info');
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => prev ? {
              ...prev,
              sourceUrl: raw,
              isSearchingSources: false,
              hasSearched: true,
              continuationSources: [{
                id: raw,
                title: prev.title || 'Direct Source',
                url: raw,
                source: 'Direct Web URL'
              }]
            } : null);
          }
          const onScan = callbacks.handleScanContinuationToc || callbacks.onScanToc;
          if (typeof onScan === 'function') {
            onScan(raw, options.ongoingEpubModal?.existingCount || 0);
          }
          return [];
        }

        if (typeof setOngoingEpubModal === 'function') {
          setOngoingEpubModal(prev => prev ? {
            ...prev,
            isSearchingSources: true,
            hasSearched: true,
            continuationSources: []
          } : null);
        }

        try {
          const deduped = await MoonReaderEngine.searchContinuationSources(raw, (partialList) => {
            if (typeof setOngoingEpubModal === 'function') {
              setOngoingEpubModal(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  continuationSources: partialList
                };
              });
            }
          });

          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => {
              if (!prev) return null;
              return {
                ...prev,
                isSearchingSources: false,
                hasSearched: true,
                continuationSources: deduped
              };
            });
          }

          if (deduped.length === 0 && typeof toast === 'function') {
            toast('No online sources found for this keyword. Try a shorter title or paste the novel URL directly.', 'warning');
          } else if (deduped.length > 0 && typeof toast === 'function') {
            toast(`Found ${deduped.length} source match${deduped.length === 1 ? '' : 'es'}! Tap any source below to switch.`, 'success');
          }

          return deduped;
        } catch (err) {
          console.error('[handleSearchContinuationSources] Error:', err);
          if (typeof setOngoingEpubModal === 'function') {
            setOngoingEpubModal(prev => prev ? { ...prev, isSearchingSources: false, hasSearched: true } : null);
          }
          if (typeof toast === 'function') {
            toast('Failed searching sources: ' + (err.message || err), 'error');
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

        // Auto-persist selected source website to novel record
        const curNovel = options.ongoingEpubModal?.novelItem || options.novelItem || options.novel;
        if (curNovel && window.LibraryEngine?.assignNovelSourceUrl) {
          window.LibraryEngine.assignNovelSourceUrl(curNovel, targetUrl, {
            onUpdateHistory: callbacks.setWebImportHistory,
            onUpdateWebImportData: callbacks.setWebImportData,
            onUpdateActiveNovelRecord: callbacks.setActiveNovelRecord
          }).catch(() => {});
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
              id: ongoingEpubModal.novelId || ongoingEpubModal.novelItem?.id,
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
    },

    PositionBridge: {
      getDeviceId() {
        try {
          let id = localStorage.getItem('gemini_moon_device_id');
          if (!id) {
            id = 'gm_' + Math.random().toString(16).slice(2, 10);
            localStorage.setItem('gemini_moon_device_id', id);
          }
          return id;
        } catch (e) {
          return 'gm_default';
        }
      },

      encodePo(opts = {}) {
        const {
          chapterIdx = 0,
          splitIdx = 0,
          charOffset = 0,
          pct = 0,
          scrollTop = 0,
          deviceId = null
        } = opts;
        const dev = deviceId || this.getDeviceId();
        const safePct = typeof pct === 'number' ? Math.max(0, Math.min(100, pct)).toFixed(1) : '0.0';
        const safeScroll = Math.max(0, Math.round(scrollTop || 0));
        const safeChar = Math.max(0, Math.round(charOffset || 0));
        return `${dev}*${chapterIdx}@${splitIdx}#${safeChar}:${safePct}%|${safeScroll}`;
      },

      decodePo(raw) {
        if (!raw || typeof raw !== 'string') return null;
        try {
          const str = raw.trim();
          const starIdx = str.indexOf('*');
          if (starIdx === -1) return null;
          const deviceId = str.slice(0, starIdx);
          const remainder = str.slice(starIdx + 1);

          let body = remainder;
          let scrollTop = 0;
          const pipeIdx = remainder.indexOf('|');
          if (pipeIdx !== -1) {
            body = remainder.slice(0, pipeIdx);
            scrollTop = parseInt(remainder.slice(pipeIdx + 1), 10) || 0;
          }

          let chapterIdx = 0;
          let splitIdx = 0;
          let charOffset = 0;
          let pct = 0;

          const atIdx = body.indexOf('@');
          const hashIdx = body.indexOf('#');
          const colonIdx = body.indexOf(':');

          if (hashIdx !== -1) {
            const chapPart = body.slice(0, hashIdx);
            if (atIdx !== -1 && atIdx < hashIdx) {
              chapterIdx = parseInt(chapPart.slice(0, atIdx), 10) || 0;
              splitIdx = parseInt(chapPart.slice(atIdx + 1), 10) || 0;
            } else {
              chapterIdx = parseInt(chapPart, 10) || 0;
            }

            if (colonIdx !== -1 && colonIdx > hashIdx) {
              charOffset = parseInt(body.slice(hashIdx + 1, colonIdx), 10) || 0;
              const pctPart = body.slice(colonIdx + 1).replace('%', '').trim();
              pct = parseFloat(pctPart) || 0;
            } else {
              charOffset = parseInt(body.slice(hashIdx + 1), 10) || 0;
            }
          } else if (colonIdx !== -1) {
            chapterIdx = parseInt(body.slice(0, colonIdx), 10) || 0;
            const pctPart = body.slice(colonIdx + 1).replace('%', '').trim();
            pct = parseFloat(pctPart) || 0;
          } else {
            chapterIdx = parseInt(body, 10) || 0;
          }

          return {
            deviceId,
            chapterIdx: Math.max(0, chapterIdx),
            splitIdx: Math.max(0, splitIdx),
            charOffset: Math.max(0, charOffset),
            pct: Math.max(0, Math.min(100, pct)),
            scrollTop: Math.max(0, scrollTop)
          };
        } catch (e) {
          console.warn('Failed to parse Moon+ Reader .po string:', e);
          return null;
        }
      },

      savePositionToPo(novelKey, opts = {}) {
        if (!novelKey) return;
        const { chapterIdx = 0, scrollTop = 0, pct = 0, totalChars = 0 } = opts;
        try {
          const poStr = this.encodePo({
            chapterIdx,
            splitIdx: 0,
            charOffset: Math.round(((pct || 0) / 100) * (totalChars || 5000)),
            pct,
            scrollTop
          });
          const normKey = String(novelKey).trim().toLowerCase();
          localStorage.setItem('moon_po_' + normKey, poStr);

          const mappingStore = JSON.parse(localStorage.getItem('gemini_novel_folder_mappings') || '{}');
          const mapped = mappingStore[normKey];
          if (mapped?.folderTreeUri && window.NativeBridge?.writeFileInTree) {
            const cleanTitle = (mapped.cleanTitle || novelKey).replace(/[\/\\?%*:|"<>]/g, '_');
            const poFileName = cleanTitle.endsWith('.epub') ? `${cleanTitle}.po` : `${cleanTitle}.epub.po`;
            window.NativeBridge.writeFileInTree(mapped.folderTreeUri, mapped.folderPath || '', poFileName, poStr);
          }
        } catch (e) {
          console.warn('savePositionToPo failed:', e);
        }
      },

      getPositionFromPo(novelKey) {
        if (!novelKey) return null;
        try {
          const normKey = String(novelKey).trim().toLowerCase();
          const raw = localStorage.getItem('moon_po_' + normKey);
          return raw ? this.decodePo(raw) : null;
        } catch (e) {
          return null;
        }
      }
    },

    StatusBar: function MoonReaderStatusBar(props) {
      const {
        bookTitle = '',
        chapterTitle = '',
        chapterIndex = 0,
        totalChapters = 1,
        chapterScrollPct = 0,
        visible = true,
        chapters = [],
        currentChapter = null,
        currentPage = 0,
        totalPages = 1,
        viewMode = 'scroll'
      } = props;

      const [screenMetrics, setScreenMetrics] = React.useState({ currentScreen: 1, totalScreens: 1 });

      // Compute screens dynamically in vertical scroll mode
      React.useEffect(() => {
        const updateScreens = () => {
          if (viewMode === 'paginated') {
            const nextCur = Math.max(1, (currentPage || 0) + 1);
            const nextTot = Math.max(1, totalPages || 1);
            setScreenMetrics(prev => (prev.currentScreen === nextCur && prev.totalScreens === nextTot) ? prev : { currentScreen: nextCur, totalScreens: nextTot });
            return;
          }
          const el = document.getElementById('gemini-reader-scroll-area');
          if (el) {
            const vh = el.clientHeight || window.innerHeight || 800;
            const sh = el.scrollHeight || vh;
            const tot = Math.max(1, Math.ceil(sh / vh));
            const cur = Math.min(tot, Math.max(1, Math.floor(((el.scrollTop || 0) + 16) / vh) + 1));
            setScreenMetrics(prev => (prev.currentScreen === cur && prev.totalScreens === tot) ? prev : { currentScreen: cur, totalScreens: tot });
          } else {
            const tot = Math.max(1, Math.round(((currentChapter?.text?.length || 2000) / 1200)));
            const cur = Math.min(tot, Math.max(1, Math.round(tot * ((chapterScrollPct || 0) / 100))));
            setScreenMetrics(prev => (prev.currentScreen === cur && prev.totalScreens === tot) ? prev : { currentScreen: cur, totalScreens: tot });
          }
        };

        updateScreens();
        const el = document.getElementById('gemini-reader-scroll-area');
        if (el) {
          el.addEventListener('scroll', updateScreens, { passive: true });
          window.addEventListener('resize', updateScreens, { passive: true });
          return () => {
            el.removeEventListener('scroll', updateScreens);
            window.removeEventListener('resize', updateScreens);
          };
        }
      }, [chapterIndex, currentPage, totalPages, viewMode, currentChapter]);

      // Memoize chapter words and book total words for instant estimation
      const { currentChapterWords, totalBookWords, wordsReadSoFar } = React.useMemo(() => {
        if (!Array.isArray(chapters) || chapters.length === 0) {
          const w = (currentChapter?.text || currentChapter?.content || '').split(/\s+/).filter(Boolean).length || 500;
          return { currentChapterWords: w, totalBookWords: w, wordsReadSoFar: Math.round(w * (chapterScrollPct / 100)) };
        }
        let total = 0;
        let readBefore = 0;
        let curWords = 0;
        chapters.forEach((ch, idx) => {
          const w = typeof ch?.words === 'number' && ch.words > 0
            ? ch.words
            : ((ch?.text || ch?.content || '').split(/\s+/).filter(Boolean).length || Math.round((ch?.text?.length || 1000) / 5));
          total += w;
          if (idx < chapterIndex) {
            readBefore += w;
          } else if (idx === chapterIndex) {
            curWords = w;
          }
        });
        const curRead = Math.round(curWords * Math.max(0, Math.min(1, (chapterScrollPct || 0) / 100)));
        return {
          currentChapterWords: Math.max(1, curWords),
          totalBookWords: Math.max(1, total),
          wordsReadSoFar: readBefore + curRead
        };
      }, [chapters, chapterIndex, chapterScrollPct, currentChapter]);

      if (!visible) return null;

      // 1. Calculate remaining time in chapter (WPM ~ 220)
      const scrollFrac = Math.max(0, Math.min(1, (chapterScrollPct || 0) / 100));
      const remainingChapterWords = Math.max(0, Math.round(currentChapterWords * (1 - scrollFrac)));
      const chapMins = Math.ceil(remainingChapterWords / 220);
      let chapterTimeLeftStr = '';
      if (remainingChapterWords <= 30 || chapMins <= 0) {
        chapterTimeLeftStr = '< 1 min left in chapter';
      } else if (chapMins < 60) {
        chapterTimeLeftStr = `${chapMins} mins left in chapter`;
      } else {
        const h = Math.floor(chapMins / 60);
        const m = chapMins % 60;
        chapterTimeLeftStr = `${h} hr${h > 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''} left in chapter`;
      }

      // 2. Calculate remaining time in book
      const remainingBookWords = Math.max(0, totalBookWords - wordsReadSoFar);
      const bookMins = Math.ceil(remainingBookWords / 220);
      let bookTimeLeftStr = '';
      if (bookMins < 60) {
        bookTimeLeftStr = `${Math.max(1, bookMins)} mins left in book`;
      } else {
        const bh = Math.floor(bookMins / 60);
        const bm = bookMins % 60;
        bookTimeLeftStr = `${bh} hr${bh > 1 ? 's' : ''} ${bm} min${bm !== 1 ? 's' : ''} left in book`;
      }

      // 3. Formatted Chapter Title: "493: Crimson Hell (1/21)"
      const rawTitle = (chapterTitle || '').trim();
      const numMatch = rawTitle.match(/^(?:Chapter|第|Ch\.?)?\s*(\d+)[:.\s-]*(.*)/i);
      let cleanChapterDisplay = '';
      if (numMatch && numMatch[1]) {
        const num = numMatch[1];
        const rest = numMatch[2] ? numMatch[2].trim() : '';
        cleanChapterDisplay = rest ? `${num}: ${rest}` : `Chapter ${num}`;
      } else {
        cleanChapterDisplay = rawTitle || `Chapter ${chapterIndex + 1}`;
      }

      // 4. Book Screen / Page Counter: "10500/24715"
      const currentPageCount = Math.max(1, Math.round(wordsReadSoFar / 250));
      const totalPageCount = Math.max(currentPageCount, Math.round(totalBookWords / 250));

      const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;

      return h('div', { className: 'moon-reader-status-bar' },
        // Row 1: Estimated reading times (Left: chapter, Right: book)
        h('div', { className: 'moon-status-row moon-status-time-row' },
          h('span', { className: 'moon-time-chapter' }, chapterTimeLeftStr),
          h('span', { className: 'moon-time-book' }, bookTimeLeftStr)
        ),
        // Row 2: Chapter Title with Screen Number + Total Book Screens/Pages
        h('div', { className: 'moon-status-row moon-status-meta-row' },
          h('div', { className: 'moon-status-center-text' },
            `${cleanChapterDisplay} (${screenMetrics.currentScreen}/${screenMetrics.totalScreens})`
          ),
          h('div', { className: 'moon-status-pages-counter' },
            `${currentPageCount}/${totalPageCount}`
          )
        ),
        // Subtle progress track
        h('div', { className: 'moon-bottom-progress-track' },
          h('div', { className: 'moon-bottom-progress-fill', style: { width: `${Math.max(0, Math.min(100, chapterScrollPct))}%` } })
        )
      );
    },

    HighlightPalette: function MoonReaderHighlightPalette(props) {
      const { onSelectColor, selectedColor = 'yellow' } = props;
      const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
      const colors = [
        { id: 'yellow', label: 'Sun Yellow', color: '#facc15', bg: 'rgba(250, 204, 21, 0.35)' },
        { id: 'green', label: 'Emerald Green', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.35)' },
        { id: 'cyan', label: 'Sky Cyan', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.35)' },
        { id: 'pink', label: 'Blossom Pink', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.35)' },
        { id: 'orange', label: 'Sunset Orange', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.35)' }
      ];

      return h('div', { className: 'moon-highlight-palette' },
        colors.map(c => h('button', {
          key: c.id,
          type: 'button',
          className: 'moon-color-chip',
          'aria-label': `Choose ${c.label} highlight`,
          title: c.label,
          style: {
            background: c.color,
            transform: selectedColor === c.id ? 'scale(1.2)' : 'scale(1)',
            borderColor: selectedColor === c.id ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'
          },
          onClick: (e) => {
            e.stopPropagation();
            if (typeof onSelectColor === 'function') onSelectColor(c);
          }
        }))
      );
    },

    Controls: {
      TopBar: function MoonReaderTopBar(props) {
        const {
          bookTitle = '',
          hudVisible = true,
          onClose = () => {},
          onToggleMore = () => {}
        } = props;
        const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
        const ic = typeof window !== 'undefined' && window.ic ? window.ic : () => null;

        return h('div', {
          className: `moon-reader-hud-top ${hudVisible ? '' : 'reader-v2-hud-hidden'}`
        },
          h('button', {
            type: 'button',
            className: 'moon-hud-back-btn',
            'aria-label': 'Back to Library',
            title: 'Back to Library',
            onClick: (e) => { e.stopPropagation(); onClose(); }
          }, ic('ChevronLeft', 22) || ic('ArrowLeft', 20) || '<'),

          h('div', {
            className: 'moon-hud-title',
            title: bookTitle
          }, bookTitle || 'Web Novel'),

          h('button', {
            type: 'button',
            className: 'moon-hud-menu-btn',
            'aria-label': 'More Actions',
            title: 'More Actions',
            onClick: (e) => { e.stopPropagation(); onToggleMore(); }
          }, ic('MoreVertical', 20) || '⋮')
        );
      },

      QuickFontPopup: function MoonReaderQuickFontPopup(props) {
        const { fontSize = 18, setFontSize } = props;
        const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;

        return h('div', {
          className: 'moon-quick-font-popup',
          onClick: (e) => e.stopPropagation()
        },
          h('button', {
            type: 'button',
            className: 'moon-font-step-btn',
            'aria-label': 'Decrease Font Size',
            title: 'Decrease Font Size',
            onClick: () => { if (typeof setFontSize === 'function') setFontSize(s => Math.max(11, s - 1)); }
          }, 'A–'),
          h('input', {
            type: 'range',
            className: 'moon-font-slider',
            min: 11,
            max: 36,
            value: fontSize,
            'aria-label': 'Font size',
            onChange: (e) => {
              const val = parseInt(e.target.value, 10);
              if (typeof setFontSize === 'function') setFontSize(val);
            }
          }),
          h('button', {
            type: 'button',
            className: 'moon-font-step-btn',
            'aria-label': 'Increase Font Size',
            title: 'Increase Font Size',
            onClick: () => { if (typeof setFontSize === 'function') setFontSize(s => Math.min(36, s + 1)); }
          }, 'A+'),
          h('span', { className: 'moon-font-val' }, `${fontSize}px`)
        );
      },

      BottomHud: function MoonReaderBottomHud(props) {
        const {
          hudVisible = true,
          activeIdx = 0,
          safeChapters = [],
          changeChapter = () => {},
          isScrubbing = false,
          setIsScrubbing = () => {},
          chapterScrollPct = 0,
          fontSize = 18,
          setFontSize = () => {},
          showQuickFont = false,
          setShowQuickFont = () => {},
          onToggleSearch = () => {},
          onOpenSuite = () => {},
          onOpenDashboard = () => {},
          onToggleMore = () => {},
          ttsActive = false,
          toggleTts = () => {},
          onOpenSettings = () => {},
          autoScroll = false,
          onToggleAutoScroll = () => {},
          onToggleBookmark = () => {},
          isCurrentBookmarked = false,
          onOpenToc = () => {},
          onOpenBookmarksDrawer = () => {}
        } = props;
        const h = typeof React !== 'undefined' ? React.createElement : window.React?.createElement;
        const ic = typeof window !== 'undefined' && window.ic ? window.ic : () => null;

        const [isDragging, setIsDragging] = React.useState(false);
        const [dragVal, setDragVal] = React.useState(activeIdx);
        const dragValRef = React.useRef(activeIdx);

        // Keep local scrubber in sync with active chapter when not dragging
        React.useEffect(() => {
          if (!isDragging) {
            setDragVal(activeIdx);
            dragValRef.current = activeIdx;
          }
        }, [activeIdx, isDragging]);

        const totalChs = Math.max(1, safeChapters.length);
        const displayIdx = isDragging ? dragVal : activeIdx;
        const calcPct = Math.min(100, Math.max(0, Math.round(((displayIdx + Math.max(0, Math.min(1, (chapterScrollPct || 0) / 100))) / totalChs) * 100)));

        return h('div', {
          className: `moon-reader-hud-bottom ${hudVisible ? '' : 'reader-v2-hud-hidden'}`,
          onClick: (e) => e.stopPropagation()
        },
          // Quick Font Size Floating Slider
          showQuickFont && h(MoonReaderEngine.Controls.QuickFontPopup, {
            fontSize,
            setFontSize,
            onClose: () => setShowQuickFont(false)
          }),

          // Row 1: Moon+ Reader Scrubber (<, slider with live tooltip, 42% >)
          h('div', { className: 'moon-hud-scrubber-row' },
            h('button', {
              type: 'button',
              className: 'moon-hud-scrub-btn',
              disabled: activeIdx <= 0,
              'aria-label': 'Previous Chapter',
              title: 'Previous Chapter',
              onClick: () => changeChapter(activeIdx - 1, { scrollToBottom: true })
            }, ic('ChevronLeft', 20) || '<'),

            h('div', { className: 'moon-hud-slider-wrap' },
              isDragging && h('div', {
                style: {
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: `${Math.min(90, Math.max(10, ((dragVal + 0.5) / totalChs) * 100))}%`,
                  transform: 'translateX(-50%)',
                  background: '#181a20',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.7)',
                  pointerEvents: 'none',
                  zIndex: 100
                }
              }, `Ch. ${dragVal + 1}: ${(safeChapters[dragVal]?.title || `Chapter ${dragVal + 1}`).slice(0, 30)}`),

              h('input', {
                type: 'range',
                className: 'moon-hud-range-slider',
                min: 0,
                max: totalChs - 1,
                value: displayIdx,
                'aria-label': 'Chapter progress',
                onPointerDown: () => {
                  setIsDragging(true);
                  if (typeof setIsScrubbing === 'function') setIsScrubbing(true);
                },
                onTouchStart: () => {
                  setIsDragging(true);
                  if (typeof setIsScrubbing === 'function') setIsScrubbing(true);
                },
                onInput: (e) => {
                  const val = parseInt(e.target.value, 10);
                  dragValRef.current = val;
                  setDragVal(val);
                },
                onChange: (e) => {
                  const val = parseInt(e.target.value, 10);
                  dragValRef.current = val;
                  setDragVal(val);
                },
                onPointerUp: () => {
                  if (isDragging) {
                    setIsDragging(false);
                    if (typeof setIsScrubbing === 'function') setIsScrubbing(false);
                    const target = dragValRef.current;
                    if (target !== activeIdx) changeChapter(target);
                  }
                },
                onTouchEnd: () => {
                  if (isDragging) {
                    setIsDragging(false);
                    if (typeof setIsScrubbing === 'function') setIsScrubbing(false);
                    const target = dragValRef.current;
                    if (target !== activeIdx) changeChapter(target);
                  }
                },
                onKeyUp: (e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                    const target = dragValRef.current;
                    if (target !== activeIdx) changeChapter(target);
                  }
                }
              })
            ),

            h('span', { className: 'moon-hud-pct-text' }, `${calcPct}%`),

            h('button', {
              type: 'button',
              className: 'moon-hud-scrub-btn',
              disabled: activeIdx >= totalChs - 1,
              'aria-label': 'Next Chapter',
              title: 'Next Chapter',
              onClick: () => changeChapter(activeIdx + 1, { scrollToBottom: false })
            }, ic('ChevronRight', 20) || '>')
          ),

          // Row 2: Secondary Tool Dock (···, Cloud Down, Cloud Up, A±, Search)
          h('div', { className: 'moon-hud-tools-row' },
            // 1. More / Chapter Tools
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'More Actions',
              title: 'More Actions',
              onClick: (e) => { e.stopPropagation(); onToggleMore(); }
            }, h('span', { style: { fontSize: 20, fontWeight: 900, letterSpacing: 1 } }, '···')),

            // 2. Cloud Down: Chapter Translation Suite Shortcut
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'Chapter Translation Suite and Line Healing',
              title: 'Chapter Translation Suite & Line Healing',
              onClick: (e) => { e.stopPropagation(); onOpenSuite(); }
            },
              h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                h('path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }),
                h('path', { d: 'M12 12v9' }),
                h('path', { d: 'm8 17 4 4 4-4' })
              )
            ),

            // 3. Cloud Up: Live Translation Dashboard Shortcut
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'Live Translation Dashboard',
              title: 'Live Translation Dashboard',
              onClick: (e) => { e.stopPropagation(); onOpenDashboard(); }
            },
              h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                h('path', { d: 'M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242' }),
                h('path', { d: 'M12 21v-9' }),
                h('path', { d: 'm8 16 4-4 4 4' })
              )
            ),

            // 4. A±: Quick Font Size
            h('button', {
              type: 'button',
              className: `moon-hud-tool-btn ${showQuickFont ? 'active' : ''}`,
              'aria-label': 'Font Size',
              title: 'Font Size',
              onClick: (e) => { e.stopPropagation(); setShowQuickFont(s => !s); }
            },
              h('span', { className: 'moon-font-badge' }, 'A', h('sup', { style: { fontSize: 10, marginLeft: 1 } }, '±'))
            ),

            // 5. Search: Find in Chapter
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'Search in Chapter',
              title: 'Search in Chapter',
              onClick: (e) => { e.stopPropagation(); onToggleSearch(); }
            }, ic('Search', 20))
          ),

          // Row 3: Primary Dock (Speak, Options, Autoscroll, Bookmarks, Chapters)
          h('div', { className: 'moon-hud-tools-row' },
            // 1. Speak (TTS)
            h('button', {
              type: 'button',
              className: `moon-hud-tool-btn ${ttsActive ? 'active' : ''}`,
              'aria-label': ttsActive ? 'Pause Read Aloud' : 'Read Aloud',
              title: ttsActive ? 'Pause Read Aloud' : 'Read Aloud (Speak)',
              onClick: (e) => { e.stopPropagation(); toggleTts(); }
            }, ic(ttsActive ? 'VolumeX' : 'Volume2', 21)),

            // 2. Options (Typography & Themes modal)
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'Visual and Typography Options',
              title: 'Visual & Typography Options',
              onClick: (e) => { e.stopPropagation(); onOpenSettings(); }
            },
              h('svg', { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                h('line', { x1: '3', y1: '6', x2: '21', y2: '6' }),
                h('line', { x1: '3', y1: '12', x2: '15', y2: '12' }),
                h('line', { x1: '3', y1: '18', x2: '18', y2: '18' })
              )
            ),

            // 3. Autoscroll (Hands-free continuous reading)
            h('button', {
              type: 'button',
              className: `moon-hud-tool-btn ${autoScroll ? 'active' : ''}`,
              'aria-label': autoScroll ? 'Stop Auto-Scroll' : 'Start Auto-Scroll',
              title: autoScroll ? 'Stop Auto-Scroll' : 'Start Auto-Scroll',
              onClick: (e) => { e.stopPropagation(); onToggleAutoScroll(); }
            }, ic('ArrowUpDown', 20)),

            // 4. Bookmarks (Open Bookmarks drawer / Hold to toggle bookmark)
            h('button', {
              type: 'button',
              className: `moon-hud-tool-btn ${isCurrentBookmarked ? 'active' : ''}`,
              'aria-label': 'Open bookmarks. Hold or right-click to bookmark this chapter.',
              title: 'Bookmarks (All) · Hold or right-click to bookmark chapter',
              onClick: (e) => {
                e.stopPropagation();
                if (typeof onOpenBookmarksDrawer === 'function') {
                  onOpenBookmarksDrawer();
                } else if (typeof onOpenToc === 'function') {
                  onOpenToc('bookmarks');
                } else {
                  onToggleBookmark();
                }
              },
              onContextMenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleBookmark();
              }
            },
              h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: isCurrentBookmarked ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                h('path', { d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z' })
              )
            ),

            // 5. Chapters (Table of Contents Drawer)
            h('button', {
              type: 'button',
              className: 'moon-hud-tool-btn',
              'aria-label': 'Table of Contents',
              title: 'Table of Contents (Chapters)',
              onClick: (e) => { e.stopPropagation(); onOpenToc(); }
            }, ic('List', 21))
          )
        );
      }
    },

    SwipeHandler: {
      createGestureTracker: function(options = {}) {
        const {
          onNextChapter = () => {},
          onPrevChapter = () => {},
          canGoNext = true,
          canGoPrev = true
        } = options;

        let startX = 0;
        let startY = 0;
        let startTime = 0;
        let isAtBottom = false;
        let isAtTop = false;
        let isTriggering = false;
        let wheelAccumulator = 0;
        let wheelTimer = null;

        const updateVisuals = (dy) => {
          const nextEl = document.getElementById('moon-reader-pull-next');
          const prevEl = document.getElementById('moon-reader-pull-prev');
          if (nextEl) nextEl.classList.toggle('active-release', isAtBottom && canGoNext && dy >= 45);
          if (prevEl) prevEl.classList.toggle('active-release', isAtTop && canGoPrev && dy <= -45);
        };

        const clearVisuals = () => {
          const nextEl = document.getElementById('moon-reader-pull-next');
          const prevEl = document.getElementById('moon-reader-pull-prev');
          if (nextEl) nextEl.classList.remove('active-release');
          if (prevEl) prevEl.classList.remove('active-release');
        };

        return {
          onTouchStart: (e) => {
            if (isTriggering) return;
            const touch = e.touches && e.touches[0];
            const target = e.currentTarget;
            if (!touch || !target) return;
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            const top = target.scrollTop || 0;
            const scrollH = target.scrollHeight;
            const clientH = target.clientHeight;
            isAtBottom = (top + clientH >= scrollH - 6);
            isAtTop = (top <= 4);
          },

          onTouchMove: (e) => {
            if (!startTime || isTriggering) return;
            const touch = e.touches && e.touches[0];
            if (!touch) return;
            const dy = startY - touch.clientY;
            const dx = startX - touch.clientX;
            if (Math.abs(dx) > Math.abs(dy) * 1.25) return;
            updateVisuals(dy);
          },

          onTouchEnd: (e) => {
            if (!startTime || isTriggering) return;
            const touch = (e.changedTouches && e.changedTouches[0]);
            const dy = touch ? (startY - touch.clientY) : 0;
            const elapsed = Date.now() - startTime;
            startTime = 0;
            clearVisuals();

            if (isAtBottom && canGoNext && dy >= 45 && elapsed < 1200) {
              isTriggering = true;
              try { window.NativeBridge?.haptic?.('light'); } catch (_) {}
              onNextChapter();
              setTimeout(() => { isTriggering = false; }, 500);
            } else if (isAtTop && canGoPrev && dy <= -45 && elapsed < 1200) {
              isTriggering = true;
              try { window.NativeBridge?.haptic?.('light'); } catch (_) {}
              onPrevChapter();
              setTimeout(() => { isTriggering = false; }, 500);
            }
          },

          onWheel: (e) => {
            if (isTriggering) return;
            const target = e.currentTarget;
            if (!target) return;
            const top = target.scrollTop || 0;
            const scrollH = target.scrollHeight;
            const clientH = target.clientHeight;

            if (e.deltaY > 0 && top + clientH >= scrollH - 6 && canGoNext) {
              wheelAccumulator += e.deltaY;
              clearTimeout(wheelTimer);
              wheelTimer = setTimeout(() => { wheelAccumulator = 0; }, 300);
              if (wheelAccumulator >= 90) {
                wheelAccumulator = 0;
                isTriggering = true;
                try { window.NativeBridge?.haptic?.('light'); } catch (_) {}
                onNextChapter();
                setTimeout(() => { isTriggering = false; }, 500);
              }
            } else if (e.deltaY < 0 && top <= 6 && canGoPrev) {
              wheelAccumulator += e.deltaY;
              clearTimeout(wheelTimer);
              wheelTimer = setTimeout(() => { wheelAccumulator = 0; }, 300);
              if (wheelAccumulator <= -90) {
                wheelAccumulator = 0;
                isTriggering = true;
                try { window.NativeBridge?.haptic?.('light'); } catch (_) {}
                onPrevChapter();
                setTimeout(() => { isTriggering = false; }, 500);
              }
            } else {
              wheelAccumulator = 0;
            }
          }
        };
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
  window.encodeMoonReaderPosition = MoonReaderEngine.PositionBridge.encodePo.bind(MoonReaderEngine.PositionBridge);
  window.decodeMoonReaderPosition = MoonReaderEngine.PositionBridge.decodePo.bind(MoonReaderEngine.PositionBridge);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoonReaderEngine;
  }
})(typeof window !== 'undefined' ? window : this);
