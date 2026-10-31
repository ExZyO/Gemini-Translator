// ══════════════════════════════════════════════════════════════════════
// GEMINI NOVEL TRANSLATOR — HIGH-PERFORMANCE DEXIE.JS DATABASE ENGINE
// Version: 8.11.0
// ══════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  const DexieClass = (typeof global !== 'undefined' && global.Dexie) ? global.Dexie : (typeof Dexie !== 'undefined' ? Dexie : null);

  // 1. Initialize Dexie Database Instances (with zero data loss guarantee)
  let novelDB = null;
  let appDB = null;

  if (DexieClass) {
    try {
      // Wrap GeminiTranslatorNovelDB:
      // Preserves existing v3 schema: novels (id), active_translations (id), trash (id)
      // Upgrades cleanly to v4 to add secondary query indexes without touching existing records
      novelDB = new DexieClass('GeminiTranslatorNovelDB');
      novelDB.version(3).stores({
        novels: 'id',
        active_translations: 'id',
        trash: 'id'
      });
      novelDB.version(4).stores({
        novels: 'id, title, status, sourceUrl, addedAt, deletedAt, timestamp',
        active_translations: 'id, timestamp',
        trash: 'id, deletedAt, timestamp'
      });
      novelDB.version(5).stores({
        novels: 'id, title, status, sourceUrl, addedAt, deletedAt, timestamp',
        active_translations: 'id, timestamp',
        trash: 'id, deletedAt, timestamp',
        translation_memory: 'id, sourceHash, sourceLang, targetLang, novelId, timestamp',
        translation_snapshots: 'id, novelId, chapterIdx, timestamp, model'
      });
      novelDB.version(6).stores({
        novels: 'id, title, status, sourceUrl, addedAt, deletedAt, timestamp',
        active_translations: 'id, timestamp',
        trash: 'id, deletedAt, timestamp',
        translation_memory: 'id, sourceHash, sourceLang, targetLang, novelId, timestamp',
        translation_snapshots: 'id, novelId, chapterIdx, timestamp, model',
        site_recipes: 'id, updatedAt'
      });
      novelDB.version(7).stores({
        novels: 'id, title, status, sourceUrl, addedAt, deletedAt, timestamp',
        active_translations: 'id, timestamp',
        trash: 'id, deletedAt, timestamp',
        translation_memory: 'id, sourceHash, sourceLang, targetLang, novelId, timestamp',
        translation_snapshots: 'id, novelId, chapterIdx, timestamp, model',
        site_recipes: 'id, updatedAt',
        site_auth: 'siteId, updatedAt'
      });

      // Wrap GeminiTranslatorDB:
      // Preserves existing v1 schema: history (id), glossaries (name), kv (key)
      appDB = new DexieClass('GeminiTranslatorDB');
      appDB.version(1).stores({
        history: 'id',
        glossaries: 'name',
        kv: 'key'
      });

      console.log('[db_engine] Dexie.js 3.2.4 database instances initialized successfully.');
    } catch (err) {
      console.warn('[db_engine] Dexie initialization warning:', err);
    }
  }

  global.novelDB = novelDB;
  global.appDB = appDB;

  // 2. Native IndexedDB Fallback Connection Helper
  let nativeDbPromise = null;
  function getNativeDB() {
    if (!nativeDbPromise) {
      nativeDbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open('GeminiTranslatorNovelDB', 7);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('novels')) {
            db.createObjectStore('novels', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('active_translations')) {
            db.createObjectStore('active_translations', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('trash')) {
            db.createObjectStore('trash', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('translation_memory')) {
            const tmStore = db.createObjectStore('translation_memory', { keyPath: 'id' });
            tmStore.createIndex('sourceHash', 'sourceHash', { unique: false });
            tmStore.createIndex('novelId', 'novelId', { unique: false });
          }
          if (!db.objectStoreNames.contains('translation_snapshots')) {
            const snapStore = db.createObjectStore('translation_snapshots', { keyPath: 'id' });
            snapStore.createIndex('novelId', 'novelId', { unique: false });
            snapStore.createIndex('chapterIdx', 'chapterIdx', { unique: false });
          }
          if (!db.objectStoreNames.contains('site_recipes')) {
            const recipeStore = db.createObjectStore('site_recipes', { keyPath: 'id' });
            recipeStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('site_auth')) {
            db.createObjectStore('site_auth', { keyPath: 'siteId' });
          }
        };
        req.onsuccess = () => {
          if (req.result) {
            req.result.onversionchange = () => { try { req.result.close(); } catch (_) {} };
          }
          resolve(req.result);
        };
        req.onerror = () => { console.warn('[db_engine] Native IndexedDB open error:', req.error); resolve(null); };
      });
    }
    return nativeDbPromise;
  }

  // 3. Dispatch Reactive Database Event
  function notifyChange(action, payload) {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('gemini:novel-db-change', {
          detail: { action, payload, timestamp: Date.now() }
        }));
      }
    } catch (_) {}
  }

  // 4. Unified GeminiNovelDB API (Dexie-powered with Native fallback)
  const GeminiNovelDB = {
    dexie: novelDB,
    getDB: getNativeDB,

    async saveNovel(novel) {
      if (!novel || !novel.id) return false;
      try {
        if (novelDB) {
          await novelDB.novels.put(novel);
          notifyChange('saveNovel', novel);
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie saveNovel fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readwrite');
          const store = tx.objectStore('novels');
          store.put(novel);
          tx.oncomplete = () => { notifyChange('saveNovel', novel); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('[db_engine] Native saveNovel failed:', e);
        return false;
      }
    },

    async updateNovel(idOrNovel, changes) {
      if (!idOrNovel) return false;
      const id = typeof idOrNovel === 'string' ? idOrNovel : (idOrNovel.id || null);
      const updateData = changes || (typeof idOrNovel === 'object' ? idOrNovel : {});
      if (!id) return false;
      try {
        if (novelDB) {
          if (changes) {
            await novelDB.novels.update(id, changes);
          } else {
            await novelDB.novels.put(updateData);
          }
          notifyChange('updateNovel', { id, ...updateData });
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie updateNovel fallback to native:', err);
      }
      try {
        const existing = await this.getNovel(id);
        const merged = existing ? { ...existing, ...updateData } : updateData;
        return await this.saveNovel(merged);
      } catch (e) {
        return false;
      }
    },

    async getNovel(id) {
      if (!id) return null;
      try {
        if (novelDB) {
          const item = await novelDB.novels.get(id);
          return item || null;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getNovel fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readonly');
          const store = tx.objectStore('novels');
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        console.warn('[db_engine] Native getNovel failed:', e);
        return null;
      }
    },

    async getAllNovels() {
      try {
        if (novelDB) {
          return await novelDB.novels.toArray();
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getAllNovels fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readonly');
          const store = tx.objectStore('novels');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        console.warn('[db_engine] Native getAllNovels failed:', e);
        return [];
      }
    },

    async getAllNovelsSummary() {
      const mapSummary = (n) => ({
        id: n.id,
        title: n.title,
        author: n.author,
        summary: n.summary || '',
        coverUrl: n.coverUrl || '',
        cover: n.cover || '',
        totalChapters: Array.isArray(n.chapters) ? n.chapters.length : (n.totalChapters || 0),
        chapterCount: n.chapterCount || (Array.isArray(n.chapters) ? n.chapters.length : (n.rawChapters ? n.rawChapters.length : 0)),
        totalChapterCount: n.totalChapterCount || (n.chapterList ? n.chapterList.length : (n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0))),
        volumeCount: n.volumeCount || 0,
        currentChapter: n.currentChapter || 0,
        readingProgress: n.readingProgress || 0,
        isIncomplete: !!n.isIncomplete,
        isTranslated: !!n.isTranslated || (n.title || '').includes('(Translated)'),
        inSavedSpace: !!n.inSavedSpace,
        wordCount: n.wordCount || 0,
        timestamp: n.timestamp || n.updatedAt || 0,
        updatedAt: n.updatedAt || n.timestamp || 0,
        isEpub: !!n.isEpub,
        tags: n.tags || [],
        folder: n.folder || '',
        folderTreeUri: n.folderTreeUri || '',
        folderPath: n.folderPath || '',
        sourceUrl: n.sourceUrl || n.url || '',
        sources: n.sources || [],
        status: n.status || '',
        source: n.source || '',
        publishedDate: n.publishedDate || '',
        chapterList: n.chapterList || []
      });

      try {
        if (novelDB) {
          const summaries = [];
          await novelDB.novels.each(n => {
            if (n) summaries.push(mapSummary(n));
          });
          return summaries;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getAllNovelsSummary fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readonly');
          const store = tx.objectStore('novels');
          const summaries = [];
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const n = cursor.value;
              if (n) {
                summaries.push(mapSummary(n));
              }
              cursor.continue();
            } else {
              resolve(summaries);
            }
          };
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        console.warn('[db_engine] Native getAllNovelsSummary failed:', e);
        return [];
      }
    },

    async getNovelByTitle(title) {
      if (!title || typeof title !== 'string') return null;
      const cleanTarget = title.trim().toLowerCase();
      try {
        if (novelDB) {
          const exact = await novelDB.novels.where('title').equalsIgnoreCase(title.trim()).first();
          if (exact) return exact;
          const all = await novelDB.novels.toArray();
          return (all || []).find(n => n && (n.title || '').trim().toLowerCase() === cleanTarget) || null;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getNovelByTitle fallback:', err);
      }
      try {
        const all = await this.getAllNovels();
        return (all || []).find(n => n && (n.title || '').trim().toLowerCase() === cleanTarget) || null;
      } catch (_) {
        return null;
      }
    },

    async deleteNovel(id) {
      if (!id) return false;
      try {
        if (novelDB) {
          await novelDB.novels.delete(id);
          notifyChange('deleteNovel', { id });
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie deleteNovel fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readwrite');
          const store = tx.objectStore('novels');
          store.delete(id);
          tx.oncomplete = () => { notifyChange('deleteNovel', { id }); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('[db_engine] Native deleteNovel failed:', e);
        return false;
      }
    },

    async moveToTrash(id) {
      if (!id) return false;
      try {
        if (novelDB) {
          let novel = await novelDB.novels.get(id);
          if (!novel) {
            const all = await novelDB.novels.toArray();
            novel = all.find(n => n.id === id || n.title === id || (n.title && n.title.trim().toLowerCase() === String(id).trim().toLowerCase()));
          }
          if (!novel) return false;
          novel.deletedAt = Date.now();
          const targetKey = novel.id || id;
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            await novelDB.trash.put(novel);
            await novelDB.novels.delete(targetKey);
          });
          notifyChange('moveToTrash', novel);
          return novel;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie moveToTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        const novel = await this.getNovel(id);
        if (!novel) return false;
        novel.deletedAt = Date.now();
        return new Promise((resolve) => {
          const tx = db.transaction(['novels', 'trash'], 'readwrite');
          tx.objectStore('trash').put(novel);
          tx.objectStore('novels').delete(id);
          tx.oncomplete = () => { notifyChange('moveToTrash', novel); resolve(novel); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('[db_engine] Native moveToTrash failed:', e);
        return false;
      }
    },

    async moveMultipleToTrash(ids) {
      if (!Array.isArray(ids) || ids.length === 0) return false;
      const now = Date.now();
      try {
        if (novelDB) {
          const toTrash = [];
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            for (const id of ids) {
              const novel = await novelDB.novels.get(id);
              if (novel) {
                novel.deletedAt = now;
                await novelDB.trash.put(novel);
                await novelDB.novels.delete(id);
                toTrash.push(novel);
              }
            }
          });
          notifyChange('moveMultipleToTrash', toTrash);
          return toTrash;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie moveMultipleToTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        const idSet = new Set(ids);
        const all = await this.getAllNovels();
        const toTrash = all.filter(n => idSet.has(n.id));
        return new Promise((resolve) => {
          const tx = db.transaction(['novels', 'trash'], 'readwrite');
          const novelsStore = tx.objectStore('novels');
          const trashStore = tx.objectStore('trash');
          toTrash.forEach(n => {
            n.deletedAt = now;
            trashStore.put(n);
            novelsStore.delete(n.id);
          });
          tx.oncomplete = () => { notifyChange('moveMultipleToTrash', toTrash); resolve(toTrash); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('[db_engine] Native moveMultipleToTrash failed:', e);
        return false;
      }
    },

    async moveAllToTrash() {
      const now = Date.now();
      try {
        if (novelDB) {
          const all = await novelDB.novels.toArray();
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            for (const n of all) {
              n.deletedAt = now;
              await novelDB.trash.put(n);
            }
            await novelDB.novels.clear();
          });
          notifyChange('moveAllToTrash', all);
          return all;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie moveAllToTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        const all = await this.getAllNovels();
        return new Promise((resolve) => {
          const tx = db.transaction(['novels', 'trash'], 'readwrite');
          const novelsStore = tx.objectStore('novels');
          const trashStore = tx.objectStore('trash');
          all.forEach(n => {
            n.deletedAt = now;
            trashStore.put(n);
          });
          novelsStore.clear();
          tx.oncomplete = () => { notifyChange('moveAllToTrash', all); resolve(all); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('[db_engine] Native moveAllToTrash failed:', e);
        return false;
      }
    },

    async getTrashNovels() {
      const mapTrashSummary = (n) => ({
        id: n.id,
        title: n.title,
        author: n.author || 'Author',
        summary: (n.summary || '').substring(0, 300),
        coverUrl: n.coverUrl || '',
        cover: n.cover || '',
        totalChapters: Array.isArray(n.chapters) ? n.chapters.length : (n.totalChapters || 0),
        chapterCount: n.chapterCount || (Array.isArray(n.chapters) ? n.chapters.length : (n.rawChapters ? n.rawChapters.length : 0)),
        deletedAt: n.deletedAt || n.timestamp || Date.now(),
        timestamp: n.timestamp || n.deletedAt || 0,
        sourceUrl: n.sourceUrl || n.url || '',
        isTranslated: !!n.isTranslated || (n.title || '').includes('(Translated)')
      });

      try {
        if (novelDB) {
          const list = [];
          await novelDB.trash.each(n => {
            if (n) list.push(mapTrashSummary(n));
          });
          return list;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getTrashNovels fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('trash')) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('trash', 'readonly');
          const store = tx.objectStore('trash');
          const list = [];
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const n = cursor.value;
              if (n) list.push(mapTrashSummary(n));
              cursor.continue();
            } else {
              resolve(list);
            }
          };
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        return [];
      }
    },

    async getTrashCount() {
      try {
        if (novelDB && novelDB.trash) {
          return await novelDB.trash.count();
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getTrashCount fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('trash')) return 0;
        return new Promise((resolve) => {
          const tx = db.transaction('trash', 'readonly');
          const store = tx.objectStore('trash');
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        });
      } catch (e) {
        return 0;
      }
    },

    async restoreFromTrash(id) {
      if (!id) return false;
      try {
        if (novelDB) {
          let restoredNovel = null;
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            const novel = await novelDB.trash.get(id);
            if (novel) {
              delete novel.deletedAt;
              await novelDB.novels.put(novel);
              await novelDB.trash.delete(id);
              restoredNovel = novel;
            }
          });
          notifyChange('restoreFromTrash', restoredNovel);
          return !!restoredNovel;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie restoreFromTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(['novels', 'trash'], 'readwrite');
          const trashStore = tx.objectStore('trash');
          const novelsStore = tx.objectStore('novels');
          const req = trashStore.get(id);
          req.onsuccess = () => {
            const novel = req.result;
            if (novel) {
              delete novel.deletedAt;
              novelsStore.put(novel);
              trashStore.delete(id);
            }
          };
          tx.oncomplete = () => { notifyChange('restoreFromTrash', { id }); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async restoreAllFromTrash() {
      try {
        if (novelDB) {
          const allTrash = await novelDB.trash.toArray();
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            for (const novel of allTrash) {
              delete novel.deletedAt;
              await novelDB.novels.put(novel);
            }
            await novelDB.trash.clear();
          });
          notifyChange('restoreAllFromTrash', allTrash);
          return allTrash;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie restoreAllFromTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('trash')) return [];
        const allTrash = await this.getTrashNovels();
        return new Promise((resolve) => {
          const tx = db.transaction(['novels', 'trash'], 'readwrite');
          const trashStore = tx.objectStore('trash');
          const novelsStore = tx.objectStore('novels');
          allTrash.forEach(novel => {
            delete novel.deletedAt;
            novelsStore.put(novel);
          });
          trashStore.clear();
          tx.oncomplete = () => { notifyChange('restoreAllFromTrash', allTrash); resolve(allTrash); };
          tx.onerror = () => resolve([]);
        });
      } catch (e) {
        return [];
      }
    },

    async deleteTrashNovel(id) {
      if (!id) return false;
      try {
        if (novelDB) {
          await novelDB.trash.delete(id);
          notifyChange('deleteTrashNovel', { id });
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie deleteTrashNovel fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db || !id) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('trash', 'readwrite');
          tx.objectStore('trash').delete(id);
          tx.oncomplete = () => { notifyChange('deleteTrashNovel', { id }); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async emptyTrash() {
      try {
        if (novelDB) {
          await novelDB.trash.clear();
          notifyChange('emptyTrash', null);
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie emptyTrash fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('trash')) return true;
        return new Promise((resolve) => {
          const tx = db.transaction('trash', 'readwrite');
          tx.objectStore('trash').clear();
          tx.oncomplete = () => { notifyChange('emptyTrash', null); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async saveTrashNovel(novel) {
      if (!novel || !novel.id) return false;
      try {
        if (novelDB) {
          await novelDB.trash.put(novel);
          notifyChange('saveTrashNovel', novel);
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie saveTrashNovel fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('trash', 'readwrite');
          const store = tx.objectStore('trash');
          store.put(novel);
          tx.oncomplete = () => { notifyChange('saveTrashNovel', novel); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async clearAll() {
      try {
        if (novelDB) {
          await novelDB.novels.clear();
          notifyChange('clearAll', null);
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie clearAll fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('novels', 'readwrite');
          const store = tx.objectStore('novels');
          store.clear();
          tx.oncomplete = () => { notifyChange('clearAll', null); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async saveTranslationSession(session) {
      if (!session || !session.id) return false;
      try {
        if (novelDB) {
          await novelDB.active_translations.put(session);
          notifyChange('saveTranslationSession', session);
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie saveTranslationSession fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('active_translations', 'readwrite');
          const store = tx.objectStore('active_translations');
          store.put(session);
          tx.oncomplete = () => { notifyChange('saveTranslationSession', session); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async getTranslationSession(id) {
      if (!id) return null;
      try {
        if (novelDB) {
          const s = await novelDB.active_translations.get(id);
          return s || null;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getTranslationSession fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction('active_translations', 'readonly');
          const store = tx.objectStore('active_translations');
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async getActiveTranslationSession() {
      try {
        if (novelDB && novelDB.active_translations) {
          try {
            const latest = await novelDB.active_translations.orderBy('timestamp').reverse().first();
            if (latest) return latest;
          } catch (_) {}
          const all = await novelDB.active_translations.toArray();
          if (all.length === 0) return null;
          all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          return all[0];
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getActiveTranslationSession fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction('active_translations', 'readonly');
          const store = tx.objectStore('active_translations');
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            if (all.length === 0) return resolve(null);
            all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            resolve(all[0]);
          };
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async deleteTranslationSession(id) {
      if (!id) return false;
      try {
        if (novelDB) {
          await novelDB.active_translations.delete(id);
          notifyChange('deleteTranslationSession', { id });
          return true;
        }
      } catch (err) {
        console.warn('[db_engine] Dexie deleteTranslationSession fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('active_translations', 'readwrite');
          const store = tx.objectStore('active_translations');
          store.delete(id);
          tx.oncomplete = () => { notifyChange('deleteTranslationSession', { id }); resolve(true); };
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async getAllActiveTranslations() {
      try {
        if (novelDB) {
          return await novelDB.active_translations.toArray();
        }
      } catch (err) {
        console.warn('[db_engine] Dexie getAllActiveTranslations fallback to native:', err);
      }
      try {
        const db = await getNativeDB();
        if (!db) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('active_translations', 'readonly');
          const store = tx.objectStore('active_translations');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        return [];
      }
    },

    async getAllTranslationMemory() {
      try {
        if (novelDB && novelDB.translation_memory) {
          return await novelDB.translation_memory.toArray();
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('translation_memory')) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('translation_memory', 'readonly');
          const req = tx.objectStore('translation_memory').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) { return []; }
    },

    async saveTranslationMemoryBatch(items) {
      if (!Array.isArray(items) || items.length === 0) return true;
      try {
        if (novelDB && novelDB.translation_memory) {
          await novelDB.translation_memory.bulkPut(items);
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('translation_memory')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('translation_memory', 'readwrite');
          const store = tx.objectStore('translation_memory');
          items.forEach(it => store.put(it));
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    async getAllTranslationSnapshots() {
      try {
        if (novelDB && novelDB.translation_snapshots) {
          return await novelDB.translation_snapshots.toArray();
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('translation_snapshots')) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('translation_snapshots', 'readonly');
          const req = tx.objectStore('translation_snapshots').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) { return []; }
    },

    async saveTranslationSnapshotsBatch(items) {
      if (!Array.isArray(items) || items.length === 0) return true;
      try {
        if (novelDB && novelDB.translation_snapshots) {
          await novelDB.translation_snapshots.bulkPut(items);
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('translation_snapshots')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('translation_snapshots', 'readwrite');
          const store = tx.objectStore('translation_snapshots');
          items.forEach(it => store.put(it));
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    // 5b. Site Recipes Storage API (v6 Schema)
    async getAllSiteRecipes() {
      try {
        if (novelDB && novelDB.site_recipes) {
          return await novelDB.site_recipes.toArray();
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_recipes')) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('site_recipes', 'readonly');
          const req = tx.objectStore('site_recipes').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) { return []; }
    },

    async saveSiteRecipe(recipe) {
      if (!recipe || !recipe.id) return false;
      try {
        if (novelDB && novelDB.site_recipes) {
          await novelDB.site_recipes.put(recipe);
          notifyChange('saveSiteRecipe', recipe);
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_recipes')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('site_recipes', 'readwrite');
          tx.objectStore('site_recipes').put(recipe);
          tx.oncomplete = () => {
            notifyChange('saveSiteRecipe', recipe);
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    async saveSiteRecipesBatch(items) {
      if (!Array.isArray(items) || items.length === 0) return true;
      try {
        if (novelDB && novelDB.site_recipes) {
          await novelDB.site_recipes.bulkPut(items);
          notifyChange('saveSiteRecipesBatch', { count: items.length });
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_recipes')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('site_recipes', 'readwrite');
          const store = tx.objectStore('site_recipes');
          items.forEach(it => store.put(it));
          tx.oncomplete = () => {
            notifyChange('saveSiteRecipesBatch', { count: items.length });
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    async deleteSiteRecipe(id) {
      if (!id) return false;
      try {
        if (novelDB && novelDB.site_recipes) {
          await novelDB.site_recipes.delete(id);
          notifyChange('deleteSiteRecipe', { id });
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_recipes')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('site_recipes', 'readwrite');
          tx.objectStore('site_recipes').delete(id);
          tx.oncomplete = () => {
            notifyChange('deleteSiteRecipe', { id });
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    // 5c. Audiobook Exact-Second Resume Memory API
    async saveAudiobookPosition(bookKey, positionData) {
      if (!bookKey || !positionData) return false;
      try {
        if (novelDB) {
          let novel = await novelDB.novels.get(bookKey);
          if (!novel) {
            const all = await novelDB.novels.toArray();
            novel = all.find(n => n.id === bookKey || n.url === bookKey || n.sourceUrl === bookKey || (n.title && n.title.trim().toLowerCase() === String(bookKey).trim().toLowerCase()));
          }
          if (novel) {
            novel.audioProgress = {
              trackIndex: positionData.trackIndex || 0,
              trackTitle: positionData.trackTitle || '',
              currentTime: positionData.currentTime || 0,
              duration: positionData.duration || 0,
              playbackRate: positionData.playbackRate || 1.0,
              updatedAt: Date.now()
            };
            await novelDB.novels.put(novel);
            notifyChange('saveAudiobookPosition', { bookKey, novelId: novel.id, audioProgress: novel.audioProgress });
          }
        } else {
          const db = await getNativeDB();
          if (db) {
            const tx = db.transaction('novels', 'readwrite');
            const store = tx.objectStore('novels');
            const req = store.get(bookKey);
            req.onsuccess = () => {
              const novel = req.result;
              if (novel) {
                novel.audioProgress = {
                  trackIndex: positionData.trackIndex || 0,
                  trackTitle: positionData.trackTitle || '',
                  currentTime: positionData.currentTime || 0,
                  duration: positionData.duration || 0,
                  playbackRate: positionData.playbackRate || 1.0,
                  updatedAt: Date.now()
                };
                store.put(novel);
                notifyChange('saveAudiobookPosition', { bookKey, novelId: novel.id, audioProgress: novel.audioProgress });
              }
            };
          }
        }
      } catch (e) {
        console.warn('[db_engine] saveAudiobookPosition error:', e);
      }
      try {
        const adb = appDB || (typeof global !== 'undefined' && global.appDB) || (typeof window !== 'undefined' && window.appDB);
        if (adb && adb.kv) {
          await adb.kv.put({
            key: 'audio_pos_' + bookKey,
            data: positionData,
            updatedAt: Date.now()
          });
        }
      } catch (e) {}
      return true;
    },

    async getAudiobookPosition(bookKey) {
      if (!bookKey) return null;
      try {
        const adb = appDB || (typeof global !== 'undefined' && global.appDB) || (typeof window !== 'undefined' && window.appDB);
        if (adb && adb.kv) {
          const res = await adb.kv.get('audio_pos_' + bookKey);
          if (res && res.data) return res.data;
        }
      } catch (e) {}
      try {
        if (novelDB) {
          let novel = await novelDB.novels.get(bookKey);
          if (!novel) {
            const all = await novelDB.novels.toArray();
            novel = all.find(n => n.id === bookKey || n.url === bookKey || n.sourceUrl === bookKey || (n.title && n.title.trim().toLowerCase() === String(bookKey).trim().toLowerCase()));
          }
          if (novel && novel.audioProgress) return novel.audioProgress;
        } else {
          const db = await getNativeDB();
          if (db) {
            return new Promise((resolve) => {
              const tx = db.transaction('novels', 'readonly');
              const store = tx.objectStore('novels');
              const req = store.get(bookKey);
              req.onsuccess = () => resolve(req.result?.audioProgress || null);
              req.onerror = () => resolve(null);
            });
          }
        }
      } catch (e) {}
      return null;
    },

    // 6. Permanent Storage API (Exempt from Android/Browser Eviction)
    async requestPersistentStorage() {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        try {
          const isPersisted = await navigator.storage.persisted();
          if (isPersisted) {
            console.log('[db_engine] Storage is already persistent (eviction-proof).');
            return true;
          }
          const granted = await navigator.storage.persist();
          console.log(`[db_engine] Persistent storage request result: ${granted ? 'GRANTED' : 'DENIED'}`);
          return granted;
        } catch (e) {
          console.warn('[db_engine] Could not request persistent storage:', e);
          return false;
        }
      }
      return false;
    },

    async isStoragePersisted() {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        try {
          return await navigator.storage.persisted();
        } catch (_) {
          return false;
        }
      }
      return false;
    },

    // 5d. Site Authentication & Session Vault API
    async getSiteAuth(siteId) {
      if (!siteId) return null;
      try {
        if (novelDB && novelDB.site_auth) {
          return await novelDB.site_auth.get(siteId);
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_auth')) return null;
        return new Promise((resolve) => {
          const tx = db.transaction('site_auth', 'readonly');
          const req = tx.objectStore('site_auth').get(siteId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) { return null; }
    },

    async getAllSiteAuth() {
      try {
        if (novelDB && novelDB.site_auth) {
          return await novelDB.site_auth.toArray();
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_auth')) return [];
        return new Promise((resolve) => {
          const tx = db.transaction('site_auth', 'readonly');
          const req = tx.objectStore('site_auth').getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) { return []; }
    },

    async saveSiteAuth(siteId, data = {}) {
      if (!siteId) return false;
      const record = {
        siteId,
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      try {
        if (novelDB && novelDB.site_auth) {
          await novelDB.site_auth.put(record);
          notifyChange('saveSiteAuth', record);
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_auth')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('site_auth', 'readwrite');
          tx.objectStore('site_auth').put(record);
          tx.oncomplete = () => {
            notifyChange('saveSiteAuth', record);
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    async deleteSiteAuth(siteId) {
      if (!siteId) return false;
      try {
        if (novelDB && novelDB.site_auth) {
          await novelDB.site_auth.delete(siteId);
          notifyChange('deleteSiteAuth', { siteId });
          return true;
        }
      } catch (e) {}
      try {
        const db = await getNativeDB();
        if (!db || !db.objectStoreNames.contains('site_auth')) return false;
        return new Promise((resolve) => {
          const tx = db.transaction('site_auth', 'readwrite');
          tx.objectStore('site_auth').delete(siteId);
          tx.oncomplete = () => {
            notifyChange('deleteSiteAuth', { siteId });
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        });
      } catch (e) { return false; }
    },

    // 5. Subscription Helper for Reactive State
    subscribe(callback) {
      if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};
      const handler = (e) => callback(e.detail);
      window.addEventListener('gemini:novel-db-change', handler);
      return () => window.removeEventListener('gemini:novel-db-change', handler);
    }
  };

  global.GeminiNovelDB = GeminiNovelDB;

  // Auto-request permanent durable storage on initialization
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    GeminiNovelDB.requestPersistentStorage().catch(() => {});
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeminiNovelDB, novelDB, appDB };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
