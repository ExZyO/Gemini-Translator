/**
 * Gemini EPUB Translator - Library & Bookshelf Engine
 * Module: library_engine.js
 * 
 * Provides:
 * - Shelf management, metadata indexing & novel custom titles
 * - Robust novel history persistence with circular-DOM safe chapter sanitization
 * - Special Space toggling and folder option preservation
 * - Chapter update checking and differential download with EPUB compilation
 * - Recycle bin management (Move to trash, restore, permanent delete, empty trash)
 * - EPUB file reimport and library reconstitution
 */

(function(window) {
  'use strict';

  const LibraryEngine = {
    /**
     * Retrieves stored custom title if user has previously renamed this novel
     */
    getCustomTitle(novelOrUrl) {
      if (!novelOrUrl) return '';
      const url = typeof novelOrUrl === 'string' ? novelOrUrl : (novelOrUrl.sourceUrl || novelOrUrl.url || '');
      const id = typeof novelOrUrl === 'object' ? novelOrUrl.id : '';
      try {
        const raw = localStorage.getItem('gemini_novel_custom_titles');
        if (!raw) return '';
        const map = JSON.parse(raw);
        if (id && map[id]) return map[id];
        if (url) {
          const norm = url.trim().toLowerCase().replace(/\/+$/, '');
          if (map[norm]) return map[norm];
        }
      } catch(e) {}
      return '';
    },

    /**
     * Resolves canonical remote source URL for a novel across records, chapter links & sessions
     */
    async resolveNovelSourceUrl(item, options = {}) {
      if (!item) return '';
      let sourceUrl = item.sourceUrl || item.url || item.webUrl || '';
      const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
      const itemClean = cleanT(item.title);

      // 1. Try from full novel in IndexedDB if sourceUrl not found
      if (!sourceUrl && window.GeminiNovelDB && item.id) {
        try {
          const full = await window.GeminiNovelDB.getNovel(item.id);
          if (full && (full.sourceUrl || full.url || full.webUrl)) {
            sourceUrl = full.sourceUrl || full.url || full.webUrl;
          }
        } catch(e) {}
      }

      // 2. Check webImportHistory in localStorage or options
      if (!sourceUrl) {
        try {
          const historyList = options.history || JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
          const matchOrig = historyList.find(n => n && n.id !== item.id && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
          if (matchOrig) {
            sourceUrl = matchOrig.sourceUrl || matchOrig.url;
          }
        } catch(e) {}
      }

      // 3. Check across all IndexedDB records
      if (!sourceUrl && window.GeminiNovelDB) {
        try {
          const all = await window.GeminiNovelDB.getAllNovels();
          const dbMatch = (all || []).find(n => n && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
          if (dbMatch) {
            sourceUrl = dbMatch.sourceUrl || dbMatch.url;
          }
        } catch(e) {}
      }

      // 4. Inspect chapters and chapterList URLs
      if (!sourceUrl) {
        const chs = item.rawChapters || item.chapters || [];
        const chList = item.chapterList || [];
        const chWithUrl = chs.find(c => c && c.url) || chList.find(c => c && c.url);
        const chUrl = chWithUrl?.url || '';
        if (chUrl.includes('royalroad.com/fiction/')) {
          const m = chUrl.match(/(https?:\/\/[^\/]*royalroad\.com\/fiction\/\d+)/i);
          if (m) sourceUrl = m[1];
        } else if (chUrl.includes('novelfire.net/book/')) {
          const m = chUrl.match(/(https?:\/\/[^\/]*novelfire\.net\/book\/[^\/]+)/i);
          if (m) sourceUrl = m[1];
        } else if (chUrl.includes('syosetu.com/')) {
          const m = chUrl.match(/(https?:\/\/[^\/]*syosetu\.com\/[^\/]+)/i);
          if (m) sourceUrl = m[1];
        } else if (chUrl.includes('lnori.')) {
          const m = chUrl.match(/(https?:\/\/[^\/]*lnori\.(?:org|com)\/[^\/]+)/i);
          if (m) sourceUrl = m[1];
        }
      }

      // 5. Check activeCrawlSession
      if (!sourceUrl) {
        try {
          const activeSess = options.activeCrawlSession || JSON.parse(localStorage.getItem('gemini_active_crawl_session') || 'null');
          if (activeSess && (activeSess.id === item.id || cleanT(activeSess.title) === itemClean) && (activeSess.sourceUrl || activeSess.url)) {
            sourceUrl = activeSess.sourceUrl || activeSess.url;
          }
        } catch(e) {}
      }

      // If recovered, persist so future lookups are immediate
      if (sourceUrl) {
        try {
          const raw = localStorage.getItem('gemini_web_import_history_meta');
          if (raw) {
            const list = JSON.parse(raw);
            let changed = false;
            const updated = list.map(p => {
              if (p.id === item.id || (p.title && cleanT(p.title) === itemClean)) {
                changed = true;
                return { ...p, sourceUrl };
              }
              return p;
            });
            if (changed) {
              localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated));
            }
          }
          if (window.GeminiNovelDB && item.id) {
            const full = await window.GeminiNovelDB.getNovel(item.id);
            if (full && !full.sourceUrl) {
              full.sourceUrl = sourceUrl;
              await window.GeminiNovelDB.saveNovel(full);
            }
          }
        } catch(e) {}
      }

      return sourceUrl || '';
    },

    /**
     * Renames novel and propagates changes across localStorage, IndexedDB and reactive session state
     */
    async saveNovelRename(novel, newTitle, callbacks = {}) {
      if (!novel) return null;
      const trimmed = (newTitle || '').trim();
      if (!trimmed) {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast('Title cannot be empty.', 'warning');
        }
        return null;
      }
      const novelId = novel.id;
      const sourceUrl = novel.sourceUrl || novel.url || '';

      // 1. Update gemini_novel_custom_titles in localStorage
      try {
        const raw = localStorage.getItem('gemini_novel_custom_titles');
        const map = raw ? JSON.parse(raw) : {};
        if (novelId) map[novelId] = trimmed;
        if (sourceUrl) {
          const norm = sourceUrl.trim().toLowerCase().replace(/\/+$/, '');
          map[norm] = trimmed;
        }
        localStorage.setItem('gemini_novel_custom_titles', JSON.stringify(map));
      } catch(e) {}

      // 2. Update webImportHistory (localStorage & callbacks)
      let updatedHistory = [];
      try {
        const raw = localStorage.getItem('gemini_web_import_history_meta');
        const list = raw ? JSON.parse(raw) : [];
        updatedHistory = list.map(item => {
          if (item.id === novelId || (sourceUrl && (item.sourceUrl === sourceUrl || item.url === sourceUrl))) {
            return { ...item, title: trimmed, customTitle: trimmed, originalSourceTitle: item.originalSourceTitle || item.title };
          }
          return item;
        });
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedHistory));
      } catch(e) {}

      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory(prev => {
          const prevList = Array.isArray(prev) ? prev : updatedHistory;
          return prevList.map(item => {
            if (item.id === novelId || (sourceUrl && (item.sourceUrl === sourceUrl || item.url === sourceUrl))) {
              return { ...item, title: trimmed, customTitle: trimmed, originalSourceTitle: item.originalSourceTitle || item.title };
            }
            return item;
          });
        });
      }

      // 3. Update IndexedDB full record
      if (window.GeminiNovelDB && novelId) {
        try {
          const full = await window.GeminiNovelDB.getNovel(novelId);
          if (full) {
            full.title = trimmed;
            full.customTitle = trimmed;
            if (!full.originalSourceTitle) full.originalSourceTitle = novel.title;
            await window.GeminiNovelDB.saveNovel(full);
          }
        } catch(e) {
          console.warn('[LibraryEngine] Failed to update novel title in IndexedDB:', e);
        }
      }

      // 4. Update active sessions if currently active
      if (typeof callbacks.onUpdateWebImportData === 'function') {
        callbacks.onUpdateWebImportData(prev => {
          if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
            return { ...prev, title: trimmed, customTitle: trimmed, originalSourceTitle: prev.originalSourceTitle || prev.title };
          }
          return prev;
        });
      }

      if (typeof callbacks.onUpdateActiveCrawlSession === 'function') {
        callbacks.onUpdateActiveCrawlSession(prev => {
          if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
            const next = { ...prev, title: trimmed, customTitle: trimmed, originalSourceTitle: prev.originalSourceTitle || prev.title };
            try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(next)); } catch(e) {}
            return next;
          }
          return prev;
        });
      }

      if (typeof callbacks.onUpdateActiveNovelRecord === 'function') {
        callbacks.onUpdateActiveNovelRecord(prev => {
          if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
            return { ...prev, title: trimmed, customTitle: trimmed };
          }
          return prev;
        });
      }

      if (typeof callbacks.onUpdateReaderTitle === 'function') {
        callbacks.onUpdateReaderTitle(trimmed);
      }

      if (typeof callbacks.toast === 'function') {
        callbacks.toast(`Renamed novel to "${trimmed}"! Future chapter updates will use this name. ✨`, 'success');
      }

      if (typeof callbacks.onSuccess === 'function') {
        callbacks.onSuccess(trimmed);
      }

      return { success: true, novelId, newTitle: trimmed };
    },

    /**
     * Sanitizes and saves full novel record to IndexedDB and lightweight meta stub to localStorage
     */
    async saveNovelToHistory(novelData, callbacks = {}) {
      if (!novelData || !novelData.chapters || novelData.chapters.length === 0) return null;
      const totalWords = novelData.chapters.reduce((acc, c) => acc + (c.words || (c.text ? c.text.split(/\s+/).filter(Boolean).length : (c.content ? c.content.split(/\s+/).filter(Boolean).length : 0))), 0);
      const novelId = novelData.id || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

      // Sanitize chapters into plain cloneable objects without DOM nodes, functions, or circular references
      const cleanChapters = novelData.chapters.map((c, i) => ({
        idx: c.idx !== undefined ? c.idx : i,
        title: c.title || `Chapter ${i + 1}`,
        url: c.url || '',
        text: typeof c === 'string' ? c : (c.text || c.content || ''),
        content: typeof c === 'string' ? c : (c.content || c.text || ''),
        words: c.words || (c.text ? c.text.split(/\s+/).filter(Boolean).length : 0)
      }));

      // Compute volume count if multi-volume
      let detectedVolumeCount = 0;
      if (typeof novelData.volumeCount === 'number' && novelData.volumeCount > 0) {
        detectedVolumeCount = novelData.volumeCount;
      } else {
        const volNums = new Set();
        cleanChapters.forEach(c => {
          const m = (c.title || '').match(/(?:Volume|Vol\.?|Book)\s*(\d+)/i);
          if (m) volNums.add(parseInt(m[1], 10));
        });
        detectedVolumeCount = volNums.size;
      }

      // Clean originalChapters if provided
      const cleanOriginalChapters = Array.isArray(novelData.originalChapters) && novelData.originalChapters.length > 0
        ? novelData.originalChapters.map((c, i) => ({
            idx: c.idx !== undefined ? c.idx : i,
            title: c.title || `Chapter ${i + 1}`,
            url: c.url || '',
            text: typeof c === 'string' ? c : (c.text || c.content || ''),
            content: typeof c === 'string' ? c : (c.content || c.text || ''),
            words: c.words || (c.text ? c.text.split(/\s+/).filter(Boolean).length : 0)
          }))
        : null;

      const totalChapters = novelData.totalChapterCount || (novelData.chapterList ? novelData.chapterList.length : cleanChapters.length);
      const isIncomplete = novelData.isIncomplete !== undefined ? !!novelData.isIncomplete : (cleanChapters.length < totalChapters);
      const isTranslated = !!novelData.isTranslated || (novelData.title || '').includes('(Translated)');
      const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();

      let existingMeta = null;
      try {
        const storedMeta = JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
        existingMeta = storedMeta.find(n => (novelId && n.id === novelId) || (n.title && novelData.title && cleanT(n.title) === cleanT(novelData.title)));
      } catch(e) {}

      const inSavedSpace = novelData.inSavedSpace !== undefined
        ? !!novelData.inSavedSpace
        : (existingMeta?.inSavedSpace !== undefined ? !!existingMeta.inSavedSpace : false);

      const folderOpts = window.MoonReaderEngine ? window.MoonReaderEngine.getNovelFolderOptions(novelData) : {};
      const folderTreeUri = novelData.folderTreeUri || folderOpts.treeUri || existingMeta?.folderTreeUri || '';
      const folderPath = novelData.folderPath || folderOpts.folderPath || existingMeta?.folderPath || '';

      let coverArt = novelData.cover || existingMeta?.cover || '';
      if (!coverArt && novelData.title) {
        try {
          const storedMeta = JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
          const matchedAny = storedMeta.find(n => n.cover && cleanT(n.title) === cleanT(novelData.title));
          if (matchedAny?.cover) coverArt = matchedAny.cover;
        } catch(e) {}
      }
      if (!coverArt && typeof window !== 'undefined' && window.currentDocCover) {
        coverArt = window.currentDocCover;
      }
      if (!coverArt && typeof localStorage !== 'undefined') {
        coverArt = localStorage.getItem('gemini_current_doc_cover') || '';
      }

      const customTitle = novelData.customTitle || this.getCustomTitle(novelData.sourceUrl || novelData.url || novelId) || existingMeta?.customTitle;
      const finalTitle = customTitle || novelData.title || existingMeta?.title || 'Untitled Novel';

      let detectedSourceUrl = novelData.sourceUrl || novelData.url || existingMeta?.sourceUrl || existingMeta?.url || '';
      if (!detectedSourceUrl) {
        const chWithUrl = cleanChapters.find(c => c && c.url) || 
                          (cleanOriginalChapters && cleanOriginalChapters.find(c => c && c.url)) ||
                          (Array.isArray(novelData.chapterList) && novelData.chapterList.find(c => c && c.url));
        if (chWithUrl && chWithUrl.url) {
          const chUrl = chWithUrl.url;
          if (chUrl.includes('novelfire.net/book/')) {
            const m = chUrl.match(/(https?:\/\/[^\/]*novelfire\.net\/book\/[^\/]+)/i);
            if (m) detectedSourceUrl = m[1];
          } else if (chUrl.includes('royalroad.com/fiction/')) {
            const m = chUrl.match(/(https?:\/\/[^\/]*royalroad\.com\/fiction\/\d+(?:\/[^\/]+)?)/i);
            if (m) detectedSourceUrl = m[1];
          } else if (chUrl.includes('syosetu.com/')) {
            const m = chUrl.match(/(https?:\/\/[^\/]*syosetu\.com\/[^\/]+)/i);
            if (m) detectedSourceUrl = m[1];
          } else if (chUrl.includes('lnori.')) {
            const m = chUrl.match(/(https?:\/\/[^\/]*lnori\.(?:org|com)\/[^\/]+)/i);
            if (m) detectedSourceUrl = m[1];
          }
        }
      }

      const novelRecord = {
        id: novelId,
        title: finalTitle,
        customTitle: customTitle || undefined,
        originalSourceTitle: novelData.originalSourceTitle || existingMeta?.originalSourceTitle || (customTitle && customTitle !== novelData.title ? novelData.title : undefined),
        author: novelData.author || 'Author',
        summary: (novelData.summary || '').substring(0, 300),
        cover: coverArt,
        tags: novelData.tags || [],
        chapterCount: cleanChapters.length,
        totalChapterCount: totalChapters,
        volumeCount: detectedVolumeCount,
        isIncomplete,
        isTranslated,
        inSavedSpace,
        hasOriginalSource: !!(cleanOriginalChapters && cleanOriginalChapters.length > 0),
        wordCount: totalWords,
        timestamp: new Date().toISOString(),
        isEpub: !!novelData.isEpub,
        epubBlob: (novelData.isEdited || existingMeta?.isEdited) ? (novelData.epubBlob || undefined) : (novelData.epubBlob || existingMeta?.epubBlob || undefined),
        sourceUrl: detectedSourceUrl,
        chapterList: novelData.chapterList || [],
        rawChapters: cleanChapters,
        originalChapters: cleanOriginalChapters,
        originalText: novelData.originalText || '',
        translatedChapters: Array.isArray(novelData.translatedChapters) ? novelData.translatedChapters : (cleanChapters && isTranslated ? cleanChapters : null),
        targetLang: novelData.targetLang || (isTranslated ? 'en' : null),
        folderTreeUri,
        folderPath
      };

      if (window.GeminiNovelDB) {
        try {
          await window.GeminiNovelDB.saveNovel(novelRecord);
        } catch (e) {
          console.warn('[LibraryEngine] GeminiNovelDB save error:', e);
        }
      }

      const metaRecord = {
        id: novelId,
        title: novelRecord.title,
        author: novelRecord.author,
        summary: novelRecord.summary,
        cover: coverArt,
        tags: novelRecord.tags,
        chapterCount: novelRecord.chapterCount,
        totalChapterCount: novelRecord.totalChapterCount,
        volumeCount: novelRecord.volumeCount,
        isIncomplete: novelRecord.isIncomplete,
        isTranslated: novelRecord.isTranslated,
        inSavedSpace: novelRecord.inSavedSpace,
        hasOriginalSource: novelRecord.hasOriginalSource,
        hasTranslatedChapters: !!(novelRecord.translatedChapters && novelRecord.translatedChapters.length > 0),
        wordCount: novelRecord.wordCount,
        timestamp: novelRecord.timestamp,
        isEpub: novelRecord.isEpub,
        sourceUrl: novelRecord.sourceUrl,
        folderTreeUri: novelRecord.folderTreeUri,
        folderPath: novelRecord.folderPath
      };

      let updatedList = [];
      try {
        const storedMeta = JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || '[]');
        updatedList = [metaRecord, ...storedMeta.filter(n => n.id !== metaRecord.id && (!metaRecord.title || (n.title || '').trim().toLowerCase() !== metaRecord.title.trim().toLowerCase()))].slice(0, 50);
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedList));
      } catch (e) {}

      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory(prev => {
          const list = Array.isArray(prev) ? prev : updatedList;
          return [metaRecord, ...list.filter(n => n.id !== metaRecord.id && (!metaRecord.title || (n.title || '').trim().toLowerCase() !== metaRecord.title.trim().toLowerCase()))].slice(0, 50);
        });
      }

      if (!isIncomplete && cleanChapters.length >= totalChapters) {
        try { localStorage.removeItem('gemini_active_crawl_session'); } catch(e) {}
        if (typeof callbacks.onClearActiveCrawlSession === 'function') {
          callbacks.onClearActiveCrawlSession();
        }
      }

      return { novelRecord, metaRecord };
    },

    /**
     * Loads the complete novel record with all chapters from IndexedDB with multi-tier fallback
     */
    async loadFullNovel(meta) {
      if (!meta) return null;
      // 1. Try IndexedDB by meta.id
      if (window.GeminiNovelDB && meta.id) {
        try {
          const full = await window.GeminiNovelDB.getNovel(meta.id);
          if (full && (full.rawChapters?.length > 0 || full.chapters?.length > 0 || full.translatedChapters?.length > 0 || full.epubBlob)) return full;
        } catch(e) {}
      }
      // 2. Try IndexedDB by matching title or id across all stored records
      if (window.GeminiNovelDB && meta.title) {
        try {
          const all = await window.GeminiNovelDB.getAllNovels();
          const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
          const targetClean = cleanT(meta.title);
          const match = (all || []).find(n => n.id === meta.id || n.title === meta.title || (n.title && cleanT(n.title) === targetClean));
          if (match && (match.rawChapters?.length > 0 || match.chapters?.length > 0 || match.translatedChapters?.length > 0 || match.epubBlob)) return match;
        } catch(e) {}
      }
      // 3. Fallback: check if meta already contains rawChapters or chapters or epubBlob
      if (meta.rawChapters?.length > 0 || meta.chapters?.length > 0 || meta.translatedChapters?.length > 0 || meta.epubBlob) return meta;
      // 4. Fallback: check legacy localStorage storage
      try {
        const old = JSON.parse(localStorage.getItem('gemini_web_import_history') || '[]');
        const found = (old || []).find(n => n.id === (meta.id || '')) || (old || []).find(n => n.title === meta.title);
        if (found && (found.chapters?.length || found.rawChapters?.length || found.translatedChapters?.length)) {
          return { title: found.title, author: found.author, rawChapters: found.chapters || found.rawChapters || found.translatedChapters, originalChapters: found.originalChapters || null };
        }
      } catch (e) {}
      return null;
    },

    /**
     * Toggles whether a novel is pinned to the user's Special Space
     */
    async toggleNovelSavedSpace(novelId, novelFallback = null, callbacks = {}) {
      let full = await this.loadFullNovel({ id: novelId, title: novelFallback?.title });
      if (!full && novelFallback) {
        full = { ...novelFallback };
      }
      if (!full) return false;
      const newSaved = !full.inSavedSpace;
      full.inSavedSpace = newSaved;

      // Guarantee folder options and cover are preserved
      const folderOpts = window.MoonReaderEngine ? window.MoonReaderEngine.getNovelFolderOptions(full) : {};
      if (folderOpts.folderPath) full.folderPath = folderOpts.folderPath;
      if (folderOpts.treeUri) full.folderTreeUri = folderOpts.treeUri;
      if (!full.cover && novelFallback?.cover) full.cover = novelFallback.cover;

      if (window.GeminiNovelDB) {
        try { await window.GeminiNovelDB.saveNovel(full); } catch(e) {}
      }

      let updatedList = [];
      try {
        const raw = localStorage.getItem('gemini_web_import_history_meta');
        const list = raw ? JSON.parse(raw) : [];
        const exists = list.some(m => (full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()));
        if (exists) {
          updatedList = list.map(m => ((full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()))
            ? { ...m, inSavedSpace: newSaved, sourceUrl: full.sourceUrl || m.sourceUrl || full.url || m.url, cover: full.cover || m.cover, folderPath: full.folderPath || m.folderPath, folderTreeUri: full.folderTreeUri || m.folderTreeUri }
            : m);
        } else {
          updatedList = [{ ...full, inSavedSpace: newSaved }, ...list];
        }
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedList));
      } catch(e) {}

      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory(prev => {
          const list = prev || [];
          const exists = list.some(m => (full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()));
          if (exists) {
            return list.map(m => ((full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()))
              ? { ...m, inSavedSpace: newSaved, sourceUrl: full.sourceUrl || m.sourceUrl || full.url || m.url, cover: full.cover || m.cover, folderPath: full.folderPath || m.folderPath, folderTreeUri: full.folderTreeUri || m.folderTreeUri }
              : m);
          }
          return [{ ...full, inSavedSpace: newSaved }, ...list];
        });
      }

      // Also update active session / import data states so UI stays reactive
      if (typeof callbacks.onUpdateActiveCrawlSession === 'function') {
        callbacks.onUpdateActiveCrawlSession(prev => {
          if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
            const next = { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
            try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(next)); } catch(e) {}
            return next;
          }
          return prev;
        });
      }

      if (typeof callbacks.onUpdateWebImportData === 'function') {
        callbacks.onUpdateWebImportData(prev => {
          if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
            return { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
          }
          return prev;
        });
      }

      if (typeof callbacks.onUpdateActiveNovelRecord === 'function') {
        callbacks.onUpdateActiveNovelRecord(prev => {
          if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
            return { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
          }
          return prev;
        });
      }

      if (typeof callbacks.toast === 'function') {
        callbacks.toast(newSaved ? `"${full.title}" saved to your Special Space! ⭐` : `Removed from Special Space.`, 'info');
      }

      return newSaved;
    },

    /**
     * Checks remote web source for new chapters or volumes
     */
    async checkNovelUpdate(novelItem, options = {}, callbacks = {}) {
      if (!novelItem) return { hasUpdate: false, hasUpdates: false, error: 'No novel provided' };
      const full = await this.loadFullNovel(novelItem);
      let targetItem = full ? { ...novelItem, ...full } : { ...novelItem };
      const sourceUrl = await this.resolveNovelSourceUrl(targetItem, options);

      if (!sourceUrl) {
        const errMsg = `Cannot check updates: "${novelItem.title || 'Novel'}" was not imported from a web URL.`;
        if (typeof callbacks.toast === 'function') callbacks.toast(errMsg, 'warning');
        return { hasUpdate: false, hasUpdates: false, error: errMsg };
      }

      targetItem.sourceUrl = sourceUrl;

      // Self-heal: derive volumeCount if missing
      const chaptersToCheck = targetItem.rawChapters || targetItem.chapters || [];
      if (!targetItem.volumeCount && chaptersToCheck.length > 0) {
        let maxV = 0;
        chaptersToCheck.forEach(c => {
          const m = (c.title || '').match(/(?:Volume|Vol\.?|Book)\s*(\d+)/i);
          if (m) {
            const v = parseInt(m[1], 10);
            if (v > maxV) maxV = v;
          }
        });
        if (maxV > 0) {
          targetItem.volumeCount = maxV;
          try {
            const raw = localStorage.getItem('gemini_web_import_history_meta');
            if (raw) {
              const list = JSON.parse(raw);
              const upd = list.map(p => p.id === novelItem.id ? { ...p, volumeCount: maxV } : p);
              localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(upd));
            }
          } catch(e) {}
        }
      }

      const progressCb = options.onProgress || ((msg) => {
        if (typeof callbacks.toast === 'function') callbacks.toast(msg, 'info');
      });

      let res = null;
      if (window.WebNovelImporter && typeof window.WebNovelImporter.checkNovelUpdates === 'function') {
        res = await window.WebNovelImporter.checkNovelUpdates(targetItem, progressCb);
      } else if (window.WebNovelImporter && typeof window.WebNovelImporter.importUrl === 'function') {
        const remote = await window.WebNovelImporter.importUrl(sourceUrl, progressCb, { tocOnly: true });
        const remoteCount = (remote && typeof remote.totalChapterCount === 'number')
          ? remote.totalChapterCount
          : (remote?.chapterList ? remote.chapterList.length : (remote?.chapters ? remote.chapters.length : 0));
        const localCount = targetItem.rawChapters?.length || targetItem.chapters?.length || targetItem.chapterCount || 0;
        res = {
          hasUpdates: remoteCount > localCount,
          newCount: Math.max(0, remoteCount - localCount),
          remoteCount,
          localCount,
          remoteChapterList: remote?.chapterList || []
        };
      }

      const result = {
        hasUpdate: !!res?.hasUpdates,
        hasUpdates: !!res?.hasUpdates,
        newCount: res?.newCount || 0,
        totalOnline: res?.remoteCount || 0,
        remoteCount: res?.remoteCount || 0,
        localCount: res?.localCount || targetItem.volumeCount || novelItem.chapterCount || 0,
        latestChapters: res?.remoteChapterList || [],
        remoteChapterList: res?.remoteChapterList || [],
        isVolumeBased: !!res?.isVolumeBased,
        error: res?.error || null,
        targetItem
      };

      if (result.hasUpdate) {
        if (typeof callbacks.onBadgeUpdate === 'function') {
          callbacks.onBadgeUpdate(novelItem.id, {
            newCount: result.newCount,
            remoteTotal: result.remoteCount,
            isVolumeBased: result.isVolumeBased,
            remoteChapterList: result.remoteChapterList
          });
        }
        const unit = result.isVolumeBased ? (result.newCount === 1 ? 'new volume' : 'new volumes') : (result.newCount === 1 ? 'new chapter' : 'new chapters');
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`Found ${result.newCount} ${unit} for "${novelItem.title}"! 🎉`, 'success');
        }
      } else if (!result.error) {
        if (typeof callbacks.onClearBadge === 'function') {
          callbacks.onClearBadge(novelItem.id);
        }
        const unit = result.isVolumeBased ? 'vol' : 'ch';
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`"${novelItem.title}" is already up to date (${result.localCount} ${unit}).`, 'info');
        }
      } else if (result.error) {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`Check failed: ${result.error}`, 'error');
        }
      }

      return result;
    },

    /**
     * Downloads missing chapters, updates history and compiles an updated EPUB
     */
    async downloadNewChapters(novelItem, options = {}, callbacks = {}) {
      if (!novelItem) return null;
      const full = await this.loadFullNovel(novelItem);
      const targetItem = full ? { ...novelItem, ...full } : { ...novelItem };
      const sourceUrl = await this.resolveNovelSourceUrl(targetItem, options);

      if (!sourceUrl) {
        if (typeof callbacks.toast === 'function') callbacks.toast('No source URL found for this novel.', 'error');
        return null;
      }
      targetItem.sourceUrl = sourceUrl;

      const isLnori = /lnori\.(?:org|com)/i.test(sourceUrl);
      const existingRaw = (targetItem.rawChapters && targetItem.rawChapters.length > 0)
        ? targetItem.rawChapters
        : (targetItem.chapters || []);
      const prevCount = existingRaw.length;
      const badge = options.badge || (callbacks.getBadge && callbacks.getBadge(novelItem.id)) || null;

      if (typeof callbacks.toast === 'function') {
        callbacks.toast(`Fetching updates for "${targetItem.title || novelItem.title || 'Novel'}"...`, 'info');
      }

      if (typeof callbacks.onProgress === 'function') {
        callbacks.onProgress({
          title: targetItem.title || novelItem.title || 'Novel Updates',
          status: 'Connecting to source and discovering chapters…',
          pct: 5
        });
      }

      const res = await window.WebNovelImporter?.importUrl(sourceUrl, (msg, pct) => {
        if (typeof callbacks.onProgress === 'function') {
          callbacks.onProgress({
            title: targetItem.title || novelItem.title || 'Novel Updates',
            status: msg || 'Downloading new chapters…',
            pct: Math.max(5, Math.min(95, pct || 0))
          });
        }
      }, {
        initialChapters: existingRaw,
        resumeSession: targetItem,
        isUpdate: true,
        refreshToc: true,
        chapterList: badge?.remoteChapterList && badge.remoteChapterList.length > prevCount ? badge.remoteChapterList : undefined
      });

      const fetchedChapters = res?.chapters || [];
      if (fetchedChapters.length > 0) {
        const hasNew = fetchedChapters.length > prevCount;
        const customTitle = targetItem.customTitle || this.getCustomTitle(sourceUrl) || this.getCustomTitle(targetItem.id) || targetItem.title;
        const updatedNovel = {
          ...targetItem,
          title: customTitle || targetItem.title,
          customTitle: customTitle || targetItem.customTitle,
          chapters: fetchedChapters,
          rawChapters: fetchedChapters,
          chapterCount: fetchedChapters.length,
          totalChapterCount: res.totalChapterCount || fetchedChapters.length,
          chapterList: res.chapterList || targetItem.chapterList || fetchedChapters.map((c, i) => ({ url: c.url, title: c.title || `Chapter ${i + 1}` })),
          isIncomplete: false,
          sourceUrl: sourceUrl
        };

        await this.saveNovelToHistory(updatedNovel, callbacks);

        if (typeof callbacks.onClearBadge === 'function') {
          callbacks.onClearBadge(novelItem.id);
          if (targetItem.id && targetItem.id !== novelItem.id) {
            callbacks.onClearBadge(targetItem.id);
          }
        }

        if (hasNew) {
          if (typeof callbacks.toast === 'function') {
            callbacks.toast(`Updated "${updatedNovel.title}" in library! (+${fetchedChapters.length - prevCount} new chapters, ${fetchedChapters.length} total)`, 'success');
          }
        } else {
          if (typeof callbacks.toast === 'function') {
            callbacks.toast(`All ${fetchedChapters.length} chapters verified. Packaging EPUB...`, 'info');
          }
        }

        // EPUB Packaging
        if (isLnori && typeof callbacks.exportCleanLnoriEpub === 'function') {
          await callbacks.exportCleanLnoriEpub(updatedNovel);
        } else if (isLnori && typeof window.exportCleanLnoriEpub === 'function') {
          await window.exportCleanLnoriEpub(updatedNovel);
        } else {
          const chs = fetchedChapters;
          const bookTitle = this.cleanBookTitle(updatedNovel.title, chs);
          const bookAuthor = this.cleanBookAuthor(updatedNovel.author);

          try {
            if (typeof callbacks.onProgress === 'function') {
              callbacks.onProgress({ title: bookTitle, status: `Packaging ${chs.length} chapters into EPUB…`, pct: 95 });
            }

            const getOptsFn = callbacks.getEpubOptions || window.getEpubOptions;
            const opts = typeof getOptsFn === 'function'
              ? getOptsFn({ novelId: updatedNovel.id || sourceUrl || bookTitle, coverUrl: updatedNovel.cover || '' })
              : { novelId: updatedNovel.id, coverUrl: updatedNovel.cover || '' };

            let blob = null;
            if (options.appendEpub && window.appendChaptersToExistingEpub && (targetItem.epubBlob || options.originalFile)) {
              const orig = targetItem.epubBlob || options.originalFile;
              const newChaptersToAppend = fetchedChapters.slice(prevCount);
              blob = await window.appendChaptersToExistingEpub(orig, newChaptersToAppend, opts, (status, pct) => {
                if (typeof callbacks.onProgress === 'function') {
                  callbacks.onProgress({ title: bookTitle, status, pct });
                }
              });
            } else if (typeof window.generateEpubFromChapters === 'function') {
              blob = await window.generateEpubFromChapters(chs, bookTitle, bookAuthor, updatedNovel.targetLang || 'en', (status, pct, elapsed) => {
                if (typeof callbacks.onProgress === 'function') {
                  callbacks.onProgress({ title: bookTitle, status, pct, elapsed });
                }
              }, opts);
            }

            if (blob) {
              const isInc = updatedNovel.isIncomplete || (updatedNovel.totalChapterCount && chs.length < updatedNovel.totalChapterCount);
              const epubFileName = this.getEpubFileName(bookTitle, chs.length, isInc, opts.fixedFilename);
              const folderOpts = window.MoonReaderEngine ? window.MoonReaderEngine.getNovelFolderOptions(updatedNovel) : {};
              if (typeof window.saveUniversalBlob === 'function') {
                await window.saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, folderOpts);
                if (typeof callbacks.toast === 'function') {
                  callbacks.toast(`Downloaded updated raw EPUB (${chs.length} chapters)! 📥`, 'success');
                }
              }
            }
          } catch(epubErr) {
            console.error('[LibraryEngine] downloadNewChapters packaging error:', epubErr);
            if (typeof callbacks.toast === 'function') {
              callbacks.toast(`Raw EPUB packaging error: ${epubErr.message}`, 'error');
            }
          }
        }

        if (typeof callbacks.onSuccess === 'function') {
          callbacks.onSuccess(updatedNovel);
        }
        return updatedNovel;
      } else {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`No chapters were retrieved for "${novelItem.title}". Please check internet connection or URL.`, 'warning');
        }
        return null;
      }
    },

    /**
     * Moves a novel to the Recycle Bin with undo capability
     */
    async moveToTrash(novelId, callbacks = {}) {
      let itemToDelete = null;
      try {
        const raw = localStorage.getItem('gemini_web_import_history_meta');
        const list = raw ? JSON.parse(raw) : [];
        itemToDelete = list.find(n => n.id === novelId);
      } catch(e) {}

      if (window.GeminiNovelDB) {
        try {
          await window.GeminiNovelDB.moveToTrash(novelId);
        } catch(e) {
          console.warn('[LibraryEngine] moveToTrash DB error:', e);
        }
      }

      let updatedList = [];
      try {
        const raw = localStorage.getItem('gemini_web_import_history_meta');
        const list = raw ? JSON.parse(raw) : [];
        updatedList = list.filter(item => item.id !== novelId);
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedList));
      } catch (e) {}

      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory(prev => {
          const list = Array.isArray(prev) ? prev : updatedList;
          return list.filter(item => item.id !== novelId);
        });
      }

      if (typeof callbacks.onUpdateTrashCount === 'function') {
        callbacks.onUpdateTrashCount();
      }

      if (typeof callbacks.toast === 'function') {
        callbacks.toast(`Moved "${itemToDelete?.title || 'novel'}" to Recycle Bin`, 'info', {
          label: 'Undo',
          onClick: async () => {
            await this.restoreFromTrash(novelId, callbacks);
          }
        });
      }

      return itemToDelete;
    },

    /**
     * Moves multiple novels to Recycle Bin
     */
    async moveMultipleToTrash(ids, callbacks = {}) {
      if (!ids || ids.length === 0) return [];
      const idSet = new Set(ids);

      if (window.GeminiNovelDB) {
        try {
          await window.GeminiNovelDB.moveMultipleToTrash(ids);
        } catch (e) {
          console.warn('[LibraryEngine] Failed to moveMultipleToTrash:', e);
        }
      }

      let updatedList = [];
      try {
        const raw = localStorage.getItem('gemini_web_import_history_meta');
        const list = raw ? JSON.parse(raw) : [];
        updatedList = list.filter(b => !idSet.has(b.id));
        localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updatedList));
      } catch (e) {}

      if (typeof callbacks.onUpdateHistory === 'function') {
        callbacks.onUpdateHistory(prev => {
          const list = Array.isArray(prev) ? prev : updatedList;
          return list.filter(b => !idSet.has(b.id));
        });
      }

      if (typeof callbacks.onUpdateTrashCount === 'function') {
        callbacks.onUpdateTrashCount();
      }

      return ids;
    },

    /**
     * Restores a novel from the Recycle Bin back to the library shelf
     */
    async restoreFromTrash(novelId, callbacks = {}) {
      if (!novelId) return null;
      if (window.GeminiNovelDB) {
        try {
          await window.GeminiNovelDB.restoreFromTrash(novelId);
          const restored = await window.GeminiNovelDB.getNovel(novelId);
          if (restored) {
            const meta = {
              id: restored.id,
              title: restored.title,
              author: restored.author,
              summary: restored.summary,
              cover: restored.cover,
              tags: restored.tags,
              chapterCount: restored.chapterCount || (restored.rawChapters ? restored.rawChapters.length : 0),
              totalChapterCount: restored.totalChapterCount || (restored.chapterList ? restored.chapterList.length : (restored.chapterCount || (restored.rawChapters ? restored.rawChapters.length : 0))),
              volumeCount: restored.volumeCount,
              isIncomplete: !!restored.isIncomplete,
              isTranslated: !!restored.isTranslated || (restored.title || '').includes('(Translated)'),
              inSavedSpace: !!restored.inSavedSpace,
              wordCount: restored.wordCount,
              timestamp: restored.timestamp || new Date().toISOString(),
              isEpub: restored.isEpub,
              sourceUrl: restored.sourceUrl
            };

            let nextList = [];
            try {
              const raw = localStorage.getItem('gemini_web_import_history_meta');
              const list = raw ? JSON.parse(raw) : [];
              nextList = [meta, ...list.filter(n => n.id !== novelId)];
              localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(nextList));
            } catch (e) {}

            if (typeof callbacks.onUpdateHistory === 'function') {
              callbacks.onUpdateHistory(prev => {
                const list = Array.isArray(prev) ? prev : nextList;
                return [meta, ...list.filter(n => n.id !== novelId)];
              });
            }

            if (typeof callbacks.onUpdateTrashCount === 'function') {
              callbacks.onUpdateTrashCount();
            }

            if (typeof callbacks.toast === 'function') {
              callbacks.toast(`Restored "${restored.title}" to library!`, 'success');
            }

            return restored;
          }
        } catch(e) {
          console.warn('[LibraryEngine] restoreFromTrash error:', e);
        }
      }
      return null;
    },

    /**
     * Permanently purges a single record from the Recycle Bin
     */
    async permanentDelete(novelId, callbacks = {}) {
      if (window.GeminiNovelDB && novelId) {
        try {
          await window.GeminiNovelDB.deleteTrashNovel(novelId);
        } catch(e) {
          console.warn('[LibraryEngine] deleteTrashNovel error:', e);
        }
      }
      if (typeof callbacks.onUpdateTrashCount === 'function') {
        callbacks.onUpdateTrashCount();
      }
      if (typeof callbacks.toast === 'function') {
        callbacks.toast('Permanently deleted from Recycle Bin.', 'info');
      }
      return true;
    },

    /**
     * Clears all items currently in the Recycle Bin
     */
    async emptyTrash(callbacks = {}) {
      if (window.GeminiNovelDB) {
        try {
          await window.GeminiNovelDB.emptyTrash();
        } catch(e) {
          console.warn('[LibraryEngine] emptyTrash error:', e);
        }
      }
      if (typeof callbacks.onUpdateTrashCount === 'function') {
        callbacks.onUpdateTrashCount();
      }
      if (typeof callbacks.toast === 'function') {
        callbacks.toast('Recycle Bin emptied.', 'info');
      }
      return true;
    },

    /**
     * Recreates novel library entries by parsing selected EPUB files
     */
    async restoreFromEpubFiles(files, callbacks = {}) {
      const fileList = Array.from(files || []);
      if (fileList.length === 0) return 0;
      if (typeof callbacks.toast === 'function') {
        callbacks.toast(`Reading ${fileList.length} EPUB file(s)...`, 'info');
      }
      let restoredCount = 0;
      const readEpubFn = window.readEpub || window.DocumentParser?.readEpub || window.FileParserEngine?.readEpub;
      if (typeof readEpubFn !== 'function') {
        throw new Error('EPUB reader engine is not loaded.');
      }

      for (const f of fileList) {
        try {
          if (!f.name.toLowerCase().endsWith('.epub')) continue;
          const epubData = await readEpubFn(f);
          if (epubData && epubData.chapters && epubData.chapters.length > 0) {
            const bookTitle = (epubData.title || f.name.replace(/\.epub$/i, '') || 'Imported Novel').replace(/\s*-\s*\d+\s*chs?$/i, '').trim();
            const novelData = {
              title: bookTitle,
              author: epubData.author || 'Author',
              cover: epubData.cover || '',
              uuid: epubData.uuid || '',
              sourceUrl: epubData.sourceUrl || '',
              chapters: epubData.chapters.map(c => ({ title: c.title, text: c.text, content: c.text })),
              totalChapterCount: epubData.chapters.length,
              isIncomplete: false,
              isEpub: true
            };
            await this.saveNovelToHistory(novelData, callbacks);
            restoredCount++;
          }
        } catch (err) {
          console.warn('[LibraryEngine] EPUB restore failed for', f.name, err);
        }
      }

      if (restoredCount > 0) {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast(`Successfully restored ${restoredCount} novel(s) into your library!`, 'success');
        }
      } else {
        if (typeof callbacks.toast === 'function') {
          callbacks.toast('No readable EPUB chapters found.', 'warning');
        }
      }

      if (typeof callbacks.onSuccess === 'function') {
        callbacks.onSuccess(restoredCount);
      }
      return restoredCount;
    },

    /**
     * Cleans titles from web novel source tags and noise
     */
    cleanBookTitle(t, fallbackChs = []) {
      let s = String(t || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      if (!s || s === 'Web Novel' || s === 'Lnori Series' || s === 'Lnori Book' || s === 'Novel') {
        const firstCh = fallbackChs?.[0]?.title || '';
        const m = firstCh.match(/^(?:Volume\s*\d+\s*[-–:]\s*)?([^–—:\n]+)/i);
        if (m && m[1] && m[1].length > 2 && !/^(cover|part|chapter)/i.test(m[1].trim())) {
          s = m[1].trim();
        }
      }
      return s || 'Web Novel';
    },

    /**
     * Cleans author names from web novel source tags and noise
     */
    cleanBookAuthor(a) {
      let s = String(a || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
      if (!s || s === 'Author' || s === 'Unknown' || s === 'Lnori Author') return 'Author';
      return s;
    },

    /**
     * Generates a clean EPUB download filename based on settings
     */
    getEpubFileName(title, chapterCount = 0, isPartial = false, fixedFilename = true) {
      const cleanName = (typeof window.sanitizeFilename === 'function' ? window.sanitizeFilename(title) : String(title || 'Novel')).replace(/\s+/g, ' ').trim();
      if (fixedFilename !== false || !isPartial) {
        return `${cleanName}.epub`;
      }
      return `${cleanName} (Ch1-${chapterCount}).epub`;
    }
  };

  window.LibraryEngine = LibraryEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LibraryEngine;
  }
})(typeof window !== 'undefined' ? window : this);
