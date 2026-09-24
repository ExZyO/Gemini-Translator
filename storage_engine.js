/* ═══════════════════════════════════════════════════════════════════════
   GEMINI TRANSLATOR - OFFLINE STORAGE & DATABASE ENGINE (v8.17.64)
   High-capacity IndexedDB storage for novels, chapters, history, and active sessions
   ═══════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    Object.assign(root, exports);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

// ═══════════════════════════════════════
// INDEXEDDB ENGINE (High-Capacity Storage)
// ═══════════════════════════════════════
const DB_NAME = 'GeminiTranslatorDB';
const DB_VERSION = 1;

const openAppDB = () => {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('glossaries')) {
          db.createObjectStore('glossaries', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

const dbGetAll = async (storeName) => {
  if (typeof window !== 'undefined' && window.appDB && window.appDB[storeName]) {
    try {
      return await window.appDB[storeName].toArray();
    } catch (e) {
      console.warn('[appDB] dbGetAll fallback:', e);
    }
  }
  const db = await openAppDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

const dbPut = async (storeName, value) => {
  if (typeof window !== 'undefined' && window.appDB && window.appDB[storeName]) {
    try {
      await window.appDB[storeName].put(value);
      return true;
    } catch (e) {
      console.warn('[appDB] dbPut fallback:', e);
    }
  }
  const db = await openAppDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
};

const dbDelete = async (storeName, key) => {
  if (typeof window !== 'undefined' && window.appDB && window.appDB[storeName]) {
    try {
      await window.appDB[storeName].delete(key);
      return true;
    } catch (e) {
      console.warn('[appDB] dbDelete fallback:', e);
    }
  }
  const db = await openAppDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
};

const dbClear = async (storeName) => {
  if (typeof window !== 'undefined' && window.appDB && window.appDB[storeName]) {
    try {
      await window.appDB[storeName].clear();
      return true;
    } catch (e) {
      console.warn('[appDB] dbClear fallback:', e);
    }
  }
  const db = await openAppDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (e) {
      resolve(false);
    }
  });
};

const GeminiNovelDB = {
  dbPromise: null,
  getDB() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open('GeminiTranslatorNovelDB', 3);
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
        req.onerror = () => { console.warn('IndexedDB open error:', req.error); resolve(null); };
      });
    }
    return this.dbPromise;
  },
  async saveNovel(novel) {
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('novels', 'readwrite');
        const store = tx.objectStore('novels');
        store.put(novel);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB save failed:', e);
      return false;
    }
  },
  async getNovel(id) {
    try {
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction('novels', 'readonly');
        const store = tx.objectStore('novels');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('IndexedDB get failed:', e);
      return null;
    }
  },
  async getAllNovels() {
    try {
      const db = await this.getDB();
      if (!db) return [];
      return new Promise((resolve) => {
        const tx = db.transaction('novels', 'readonly');
        const store = tx.objectStore('novels');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn('IndexedDB getAll failed:', e);
      return [];
    }
  },
  async deleteNovel(id) {
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('novels', 'readwrite');
        const store = tx.objectStore('novels');
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB delete failed:', e);
      return false;
    }
  },
  async moveToTrash(id) {
    try {
      const db = await this.getDB();
      if (!db || !id) return false;
      const novel = await this.getNovel(id);
      if (!novel) return false;
      novel.deletedAt = Date.now();
      return new Promise((resolve) => {
        const tx = db.transaction(['novels', 'trash'], 'readwrite');
        tx.objectStore('trash').put(novel);
        tx.objectStore('novels').delete(id);
        tx.oncomplete = () => resolve(novel);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('GeminiNovelDB moveToTrash error:', e);
      return false;
    }
  },
  async moveMultipleToTrash(ids) {
    try {
      const db = await this.getDB();
      if (!db || !Array.isArray(ids) || ids.length === 0) return false;
      const idSet = new Set(ids);
      const all = await this.getAllNovels();
      const toTrash = all.filter(n => idSet.has(n.id));
      const now = Date.now();
      return new Promise((resolve) => {
        const tx = db.transaction(['novels', 'trash'], 'readwrite');
        const novelsStore = tx.objectStore('novels');
        const trashStore = tx.objectStore('trash');
        toTrash.forEach(n => {
          n.deletedAt = now;
          trashStore.put(n);
          novelsStore.delete(n.id);
        });
        tx.oncomplete = () => resolve(toTrash);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('GeminiNovelDB moveMultipleToTrash error:', e);
      return false;
    }
  },
  async moveAllToTrash() {
    try {
      const db = await this.getDB();
      if (!db) return false;
      const all = await this.getAllNovels();
      const now = Date.now();
      return new Promise((resolve) => {
        const tx = db.transaction(['novels', 'trash'], 'readwrite');
        const novelsStore = tx.objectStore('novels');
        const trashStore = tx.objectStore('trash');
        all.forEach(n => {
          n.deletedAt = now;
          trashStore.put(n);
        });
        novelsStore.clear();
        tx.oncomplete = () => resolve(all);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('GeminiNovelDB moveAllToTrash error:', e);
      return false;
    }
  },
  async getTrashNovels() {
    try {
      const db = await this.getDB();
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
    try {
      const db = await this.getDB();
      if (!db || !id) return false;
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
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },
  async restoreAllFromTrash() {
    try {
      const db = await this.getDB();
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
        tx.oncomplete = () => resolve(allTrash);
        tx.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  },
  async deleteTrashNovel(id) {
    try {
      const db = await this.getDB();
      if (!db || !id) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('trash', 'readwrite');
        tx.objectStore('trash').delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },
  async emptyTrash() {
    try {
      const db = await this.getDB();
      if (!db || !db.objectStoreNames.contains('trash')) return true;
      return new Promise((resolve) => {
        const tx = db.transaction('trash', 'readwrite');
        tx.objectStore('trash').clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },
  async clearAll() {
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('novels', 'readwrite');
        const store = tx.objectStore('novels');
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB clear failed:', e);
      return false;
    }
  },
  async saveTranslationSession(session) {
    try {
      const db = await this.getDB();
      if (!db || !session || !session.id) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('active_translations', 'readwrite');
        const store = tx.objectStore('active_translations');
        store.put(session);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('IndexedDB saveTranslationSession error:', e);
      return false;
    }
  },
  async getTranslationSession(id) {
    try {
      const db = await this.getDB();
      if (!db || !id) return null;
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
      const db = await this.getDB();
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
    try {
      const db = await this.getDB();
      if (!db || !id) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('active_translations', 'readwrite');
        const store = tx.objectStore('active_translations');
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
};

  if (typeof window !== 'undefined') {
    window.openAppDB = openAppDB;
    window.dbGetAll = dbGetAll;
    window.dbPut = dbPut;
    window.dbDelete = dbDelete;
    window.dbClear = dbClear;
    window.GeminiNovelDB = GeminiNovelDB;
  }

  return {
    DB_NAME,
    DB_VERSION,
    openAppDB,
    dbGetAll,
    dbPut,
    dbDelete,
    dbClear,
    GeminiNovelDB
  };
}));
