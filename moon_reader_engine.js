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
     * Searches both built-in scrapers and extension plugins for continuation sources
     */
    async searchContinuationSources(query) {
      const cleanQuery = (query || '').trim();
      if (!cleanQuery) return [];
      const results = [];

      // 1. Built-in scrapers
      if (window.WebNovelImporter?.searchNovels) {
        try {
          const scraperResults = await window.WebNovelImporter.searchNovels(cleanQuery, 'all');
          if (Array.isArray(scraperResults)) results.push(...scraperResults);
        } catch (e) {
          console.warn('[MoonReaderEngine] Scraper search error:', e);
        }
      }

      // 2. Installed source plugins (278+ extensions)
      const reg = window.sourceRegistry || window.SourceRegistry;
      if (reg && typeof reg.searchAll === 'function') {
        try {
          const pluginResults = await reg.searchAll(cleanQuery);
          if (Array.isArray(pluginResults)) {
            for (const p of pluginResults) {
              const pUrl = (p.url || p.path || '').replace(/\/$/, '');
              results.push({
                id: p.id || pUrl,
                title: p.title || p.name || cleanQuery,
                author: p.author || '',
                url: p.url || p.path,
                cover: p.cover || '',
                summary: p.summary || '',
                chapters: p.chapters || '',
                source: p.source || 'Extension Plugin'
              });
            }
          }
        } catch (e) {
          console.warn('[MoonReaderEngine] Plugin search error:', e);
        }
      }

      // Deduplicate by normalized URL
      const seenUrls = new Set();
      const deduped = [];
      for (const r of results) {
        const u = (r.url || r.path || '').replace(/\/$/, '');
        if (u && !seenUrls.has(u)) {
          seenUrls.add(u);
          deduped.push(r);
        }
      }
      return deduped;
    },

    /**
     * Scans remote TOC to discover latest online chapter count
     */
    async scanContinuationToc(targetUrl) {
      const cleanUrl = (targetUrl || '').trim();
      if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
        throw new Error('Please enter a valid web novel source URL.');
      }
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
      const remoteResult = await window.WebNovelImporter.importUrl(sourceUrl, (msg, pct) => {
        if (callbacks.onProgress) {
          callbacks.onProgress(msg || 'Downloading new chapters…', pct || 20, getElapsed());
        }
      }, {
        chapterRange: { start, end }
      });

      const newFetchedChapters = remoteResult?.chapters || [];
      if (newFetchedChapters.length === 0) {
        throw new Error('No new chapters could be retrieved from the source.');
      }

      // 2. Merge original chapters with newly fetched chapters
      const keepCount = Math.min(chapters.length, Math.max(0, start - 1));
      const originalKeep = chapters.slice(0, keepCount);
      const mergedChapters = [
        ...originalKeep.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })),
        ...newFetchedChapters.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content }))
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
      const outFileName = getFileNameFn(title, mergedChapters.length, isInc);
      const folderOpts = folderOptions || this.getNovelFolderOptions({ id: uuid, title, sourceUrl });

      if (typeof window.saveUniversalBlob === 'function') {
        await window.saveUniversalBlob(epubBlob, outFileName, 'application/epub+zip', false, folderOpts);
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
    }
  };

  window.MoonReaderEngine = MoonReaderEngine;
  window.getNovelFolderOptions = MoonReaderEngine.getNovelFolderOptions;
})(typeof window !== 'undefined' ? window : this);
