/**
 * Gemini EPUB Translator - History Engine
 * Module: history_engine.js
 * 
 * Provides:
 * - Translation History Bank management with IndexedDB unlimited persistence
 * - LocalStorage sync and fallback for fast offline preview
 * - Automatic mirroring of translated multi-chapter texts into Novel Library
 * - Full history loading, chapter extraction, deletion, and clear operations
 * - History export to JSON and single-entry text export via ExportEngine
 */

(function (global) {
  'use strict';

  const HistoryEngine = {
    /**
     * Adds a translation record to IndexedDB unlimited history,
     * syncs a light preview list to localStorage, auto-mirrors multi-chapter
     * translations to the Library novel store, and notifies via callbacks.
     */
    async addToHistory(optsOrSrc, tgt, prov, input, output, stats = null, chapters = null, history = null, callbacks = null) {
      let src = optsOrSrc;
      let targetLang = tgt;
      let pr = prov;
      let inp = input;
      let outp = output;
      let st = stats;
      let chaps = chapters;
      let hist = history;
      let cb = callbacks;

      if (optsOrSrc && typeof optsOrSrc === 'object' && !Array.isArray(optsOrSrc) && ('src' in optsOrSrc || 'input' in optsOrSrc || 'output' in optsOrSrc || 'callbacks' in optsOrSrc)) {
        src = optsOrSrc.src;
        targetLang = optsOrSrc.tgt;
        pr = optsOrSrc.prov;
        inp = optsOrSrc.input;
        outp = optsOrSrc.output;
        st = optsOrSrc.stats !== undefined ? optsOrSrc.stats : null;
        chaps = optsOrSrc.chapters || null;
        hist = optsOrSrc.history || null;
        cb = optsOrSrc.callbacks || null;
      }

      cb = cb || {};

      try {
        const genIdFn = cb.genId || (typeof window !== 'undefined' && window.genId) || function () {
          return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        };

        const entry = {
          id: genIdFn(),
          ts: new Date().toISOString(),
          srcLang: src,
          tgtLang: targetLang,
          provider: pr,
          inputPreview: (inp || '').substring(0, 200),
          outputPreview: (outp || '').substring(0, 200),
          fullInput: inp || '',
          fullOutput: outp || '',
          stats: st
        };

        // 1. Unlimited storage in IndexedDB
        const dbPutFn = cb.dbPut || (typeof window !== 'undefined' && window.dbPut);
        if (typeof dbPutFn === 'function') {
          await dbPutFn('history', entry);
        }

        // 2. React state / callback update
        const updatedList = [entry, ...(hist || [])];
        if (typeof cb.onHistoryUpdated === 'function') {
          cb.onHistoryUpdated(updatedList);
        }

        // 3. Fallback sync to localStorage (up to 10 entries)
        try {
          const lightList = [entry, ...(hist || []).slice(0, 9)].map(h => ({
            ...h,
            fullInput: (h.fullInput && h.fullInput.length > 3000) ? (h.fullInput.substring(0, 3000) + '...[Full text in IndexedDB]') : h.fullInput,
            fullOutput: (h.fullOutput && h.fullOutput.length > 3000) ? (h.fullOutput.substring(0, 3000) + '...[Full text in IndexedDB]') : h.fullOutput
          }));
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('translationHistory', JSON.stringify(lightList));
          }
        } catch (_) {}

        // 4. Auto-mirror translated books into the unified Library if multi-chapter detected
        try {
          const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+)/;
          const detectedChaps = [];
          let cur = null;
          for (const line of (outp || '').split(/\r?\n/)) {
            const t = line.trim();
            if (heading.test(t)) {
              if (cur) detectedChaps.push(cur);
              cur = { title: t, content: '' };
            } else if (cur) {
              cur.content += line + '\n';
            } else if (t) {
              cur = { title: 'Chapter 1', content: line + '\n' };
            }
          }
          if (cur) detectedChaps.push(cur);

          if (detectedChaps.length >= 2) {
            const srcChaps = (chaps && chaps.length > 0)
              ? chaps.map((c, i) => ({
                  title: c.title || `Chapter ${i + 1}`,
                  content: c.text || c.content || '',
                  text: c.text || c.content || ''
                }))
              : null;
            const saveNovelFn = cb.saveNovelToHistory || (typeof window !== 'undefined' && window.saveNovelToHistory);
            if (typeof saveNovelFn === 'function') {
              await saveNovelFn({
                title: ((detectedChaps[0].title || '').replace(heading, '') || 'Translated Book').trim() + ' (Translated)',
                author: 'Gemini Translator',
                isTranslated: true,
                chapters: detectedChaps.map(c => ({ title: c.title, content: c.content.trim() })),
                originalChapters: srcChaps,
                originalText: inp || ''
              });
            }
          }
        } catch (mirrorErr) {
          console.warn('Library auto-mirror warning:', mirrorErr);
        }

        return entry;
      } catch (e) {
        console.warn('History storage note:', e);
        if (typeof cb.onError === 'function') {
          cb.onError(e);
        }
        return null;
      }
    },

    /**
     * Loads a translation record from history, retrieving full texts from
     * IndexedDB if truncated in localStorage preview, parsing chapter headings,
     * and triggering onLoaded callback.
     */
    async loadFromHistory(entry, callbacks = {}) {
      if (!entry) return null;
      const cb = callbacks || {};
      let fullIn = entry.fullInput;
      let fullOut = entry.fullOutput;

      if (!fullIn || !fullOut || (typeof fullIn === 'string' && fullIn.includes('[Full text in IndexedDB]')) || (typeof fullOut === 'string' && fullOut.includes('[Full text in IndexedDB]'))) {
        const dbGetAllFn = cb.dbGetAll || (typeof window !== 'undefined' && window.dbGetAll);
        if (typeof dbGetAllFn === 'function') {
          try {
            const all = await dbGetAllFn('history');
            const found = (all || []).find(x => x && x.id === entry.id);
            if (found) {
              fullIn = found.fullInput || fullIn;
              fullOut = found.fullOutput || fullOut;
            }
          } catch (_) {}
        }
      }

      let parsedChapters = null;
      if (fullIn) {
        const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+)/;
        const parsed = [];
        let cur = null;
        for (const line of fullIn.split(/\r?\n/)) {
          const t = line.trim();
          if (heading.test(t)) {
            if (cur) parsed.push(cur);
            cur = { title: t, text: '', content: '' };
          } else if (cur) {
            cur.content += line + '\n';
            cur.text += line + '\n';
          } else if (t) {
            cur = { title: 'Chapter 1', content: line + '\n', text: line + '\n' };
          }
        }
        if (cur) parsed.push(cur);
        if (parsed.length > 1) {
          parsedChapters = parsed;
        }
      }

      const result = {
        inputText: fullIn || '',
        assembledText: fullOut || '',
        srcLang: entry.srcLang || 'Auto-detect',
        tgtLang: entry.tgtLang || 'English',
        chapters: parsedChapters
      };

      if (typeof cb.onLoaded === 'function') {
        cb.onLoaded(result);
      }
      return result;
    },

    /**
     * Clears all translation history entries from IndexedDB and localStorage.
     */
    async clearHistory(callbacks = {}) {
      const cb = callbacks || {};
      try {
        const dbClearFn = cb.dbClear || (typeof window !== 'undefined' && window.dbClear);
        if (typeof dbClearFn === 'function') {
          await dbClearFn('history');
        }
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('translationHistory', '[]');
          }
        } catch (_) {}
        if (typeof cb.onCleared === 'function') {
          cb.onCleared();
        }
      } catch (e) {
        console.warn('History clear warning:', e);
        if (typeof cb.onError === 'function') {
          cb.onError(e);
        }
      }
    },

    /**
     * Deletes a single history entry from IndexedDB and localStorage.
     */
    async deleteHistoryItem(id, history = [], callbacks = {}) {
      const cb = callbacks || {};
      try {
        const dbDeleteFn = cb.dbDelete || (typeof window !== 'undefined' && window.dbDelete);
        if (typeof dbDeleteFn === 'function') {
          await dbDeleteFn('history', id);
        }
        const updated = (history || []).filter(h => h && h.id !== id);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('translationHistory', JSON.stringify(updated.slice(0, 10)));
          }
        } catch (_) {}
        if (typeof cb.onDeleted === 'function') {
          cb.onDeleted(updated);
        }
        return updated;
      } catch (e) {
        console.warn('History delete warning:', e);
        if (typeof cb.onError === 'function') {
          cb.onError(e);
        }
        return history;
      }
    },

    /**
     * Exports full translation history as clean JSON backup
     */
    async exportHistoryJSON(history = [], version = '8.17.80', callbacks = {}) {
      const cb = callbacks || {};
      try {
        let historyData = null;
        const dbGetAllFn = cb.dbGetAll || (typeof window !== 'undefined' && window.dbGetAll);
        if (typeof dbGetAllFn === 'function') {
          try {
            historyData = await dbGetAllFn('history');
          } catch (_) {}
        }
        if (!historyData || historyData.length === 0) {
          historyData = (history && history.length > 0) ? history : (() => {
            try {
              return JSON.parse(localStorage.getItem('translationHistory') || '[]');
            } catch (_) {
              return [];
            }
          })();
        }
        if (!historyData || historyData.length === 0) {
          if (typeof cb.onWarning === 'function') {
            cb.onWarning('No translation history to export.');
          } else if (typeof cb.onError === 'function') {
            cb.onError(new Error('No translation history to export.'));
          }
          return null;
        }

        const exportEngine = cb.ExportEngine || (typeof window !== 'undefined' && window.ExportEngine);
        if (exportEngine && typeof exportEngine.exportHistoryJson === 'function') {
          const res = await exportEngine.exportHistoryJson(historyData, version);
          if (typeof cb.onSuccess === 'function') {
            cb.onSuccess(res);
          }
          return res;
        } else {
          throw new Error('ExportEngine is not available');
        }
      } catch (e) {
        if (typeof cb.onError === 'function') {
          cb.onError(e);
        } else {
          throw e;
        }
      }
    },

    /**
     * Exports a single translation history entry as a plain text file
     */
    async exportSingleHistoryItem(entry, callbacks = {}) {
      const cb = callbacks || {};
      try {
        if (!entry) throw new Error('No history entry provided.');
        const exportEngine = cb.ExportEngine || (typeof window !== 'undefined' && window.ExportEngine);
        if (exportEngine && typeof exportEngine.exportHistoryItemTxt === 'function') {
          const res = await exportEngine.exportHistoryItemTxt(entry);
          if (typeof cb.onSuccess === 'function') {
            cb.onSuccess(res);
          }
          return res;
        } else {
          throw new Error('ExportEngine is not available');
        }
      } catch (e) {
        if (typeof cb.onError === 'function') {
          cb.onError(e);
        } else {
          throw e;
        }
      }
    }
  };

  global.HistoryEngine = HistoryEngine;
})(typeof window !== 'undefined' ? window : this);
