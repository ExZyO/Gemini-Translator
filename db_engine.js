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

      // Wrap GeminiTranslatorDB:
      // Preserves existing v1 schema: history (id), glossaries (name), kv (key)
      appDB = new DexieClass('GeminiTranslatorDB');
      appDB.version(1).stores({
        history: 'id',
        glossaries: 'name',
        kv: 'key'
      });

      console.log('⚡ [db_engine] Dexie.js 3.2.4 database instances initialized successfully.');
    } catch (err) {
      console.warn('⚠️ [db_engine] Dexie initialization warning:', err);
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
        const req = indexedDB.open('GeminiTranslatorNovelDB', 4);
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
        };
        req.onsuccess = () => resolve(req.result);
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
          const novel = await novelDB.novels.get(id);
          if (!novel) return false;
          novel.deletedAt = Date.now();
          await novelDB.transaction('rw', novelDB.novels, novelDB.trash, async () => {
            await novelDB.trash.put(novel);
            await novelDB.novels.delete(id);
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
      try {
        if (novelDB) {
          return await novelDB.trash.toArray();
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
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch (e) {
        return [];
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
        if (novelDB) {
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

    // 5. Subscription Helper for Reactive State
    subscribe(callback) {
      if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};
      const handler = (e) => callback(e.detail);
      window.addEventListener('gemini:novel-db-change', handler);
      return () => window.removeEventListener('gemini:novel-db-change', handler);
    }
  };

  global.GeminiNovelDB = GeminiNovelDB;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeminiNovelDB, novelDB, appDB };
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
