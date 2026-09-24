    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    const h = React.createElement;
    window.studioSubTab = 'split';

    // Global event listener for errors
    window.addEventListener('error', function(event) {
      console.warn("Global error caught:", event.message, event.filename, event.lineno);
    });

    // Bulletproof Lucide Icon Component Factory (Dynamic UMD Adapter)
    const createLucideIcon = (name) => {
      return function IconComponent(props) {
        const size = (props && props.size) || 18;
        const className = (props && props.className) || '';
        const nameKebab = String(name || '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
        const nameLower = String(name || '').toLowerCase();
        const iconDef = (window.LUCIDE_ICONS && (
          window.LUCIDE_ICONS[name] ||
          window.LUCIDE_ICONS[nameLower] ||
          window.LUCIDE_ICONS[nameKebab]
        )) || (window.lucide && (
          window.lucide[name] ||
          window.lucide[nameLower] ||
          window.lucide[nameKebab] ||
          (window.lucide.icons && (
            window.lucide.icons[name] ||
            window.lucide.icons[nameLower] ||
            window.lucide.icons[nameKebab]
          ))
        )) || [];
        return h('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '2',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className
        },
          iconDef.map((el, i) => h(el[0], { key: i, ...el[1] }))
        );
      };
    };

    const LucideIcons = new Proxy({}, {
      get: (target, prop) => {
        if (!target[prop]) target[prop] = createLucideIcon(prop);
        return target[prop];
      }
    });

    const iconNamesList = [
      'Download', 'Clipboard', 'Link', 'BookText', 'FileText', 'XCircle', 'Copy',
      'Loader2', 'Eye', 'EyeOff', 'RefreshCcw', 'Save', 'Upload', 'Sun', 'Moon',
      'Columns2', 'Rows2', 'History', 'ChevronDown', 'ChevronUp', 'Zap', 'X',
      'CheckCircle2', 'AlertCircle', 'Info', 'Search', 'Trash2', 'RotateCcw',
      'Square', 'FileDown', 'Settings', 'Globe', 'Sparkles', 'Brain', 'Languages',
      'Check', 'ArrowRightLeft', 'Star', 'Clock', 'Layers', 'Scissors', 'Sliders',
      'Plus', 'Minus', 'Maximize2', 'Minimize2', 'BookOpen', 'Library', 'Key', 'Shield', 'Lock', 'Unlock',
      'Calendar', 'ArrowUpDown', 'CalendarDays', 'Volume2', 'VolumeX', 'Play', 'Pause',
      'SkipForward', 'SkipBack', 'MoreVertical', 'Type', 'Palette', 'List', 'Compass',
      'Bookmark', 'Menu', 'ArrowLeft', 'ArrowRight', 'Maximize', 'Minimize', 'ChevronsUp', 'ChevronsDown'
    ];
    iconNamesList.forEach(name => {
      window[name] = LucideIcons[name] || createLucideIcon(name);
    });

    const { Download, Clipboard, Link, BookText, FileText, XCircle, Copy, Loader2, Eye, EyeOff, RefreshCcw, Save, Upload, Sun, Moon, Columns2, Rows2, History, ChevronDown, ChevronUp, Zap, X, CheckCircle2, AlertCircle, Info, Search, Trash2, RotateCcw, Square, FileDown, Settings, Globe, Sparkles, Brain, Languages, Check, ArrowRightLeft, Star, Clock, Layers, Scissors, Sliders, Plus, Minus, Maximize2, Minimize2, BookOpen, Library, Key, Shield, Lock, Unlock, Calendar, ArrowUpDown, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, MoreVertical, Type, Palette, List, Compass, Bookmark, Menu, ArrowLeft, ArrowRight, Maximize, Minimize } = window;

    // XML Escaper for EPUB Packaging
    function escapeXml(unsafe) {
      if (unsafe === null || unsafe === undefined) return '';
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
    window.escapeXml = escapeXml;

    const ic = (Icon, size = 18, className = 'shrink-0') => {
      let comp = Icon;
      if (typeof Icon === 'string') {
        comp = LucideIcons[Icon] || window[Icon] || createLucideIcon(Icon);
      } else if (!comp) {
        comp = LucideIcons['FileText'] || LucideIcons['BookText'] || 'span';
      }
      return h(comp || 'span', { size, className });
    };
    const btn = (props, ...ch) => h('button', props, ...ch);
    window.ic = ic;
    window.btn = btn;
    // Studio UI components mounted from window.splitHtml, window.mergeHtml, window.modalHtml

    // Global PWA install prompt handler to catch event before React renders
    let globalDeferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
    });

    // ═══════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════
    let VERSION = '8.17.40';
    const MAX_PAYLOAD = 12000;
    const PROMPT_OVERHEAD = 800;
    const MAX_HISTORY = 20;
    const DEFAULT_CONCURRENCY = 3;
    const LANGUAGES = ['Auto-detect', 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean', 'Russian', 'Arabic', 'Hindi', 'Bengali', 'Urdu', 'Vietnamese', 'Turkish', 'Polish', 'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Thai', 'Indonesian', 'Malay', 'Filipino', 'Romanian', 'Hungarian', 'Czech', 'Slovak', 'Bulgarian', 'Serbian', 'Croatian', 'Ukrainian', 'Lithuanian', 'Latvian', 'Estonian', 'Slovenian', 'Catalan', 'Basque', 'Galician'];
    const TARGET_LANGUAGES = LANGUAGES.filter(l => l !== 'Auto-detect');

    const DEEPL_LANG_MAP = { 'English': 'EN', 'Spanish': 'ES', 'French': 'FR', 'German': 'DE', 'Italian': 'IT', 'Portuguese': 'PT', 'Chinese (Simplified)': 'ZH', 'Chinese (Traditional)': 'ZH', 'Japanese': 'JA', 'Korean': 'KO', 'Russian': 'RU', 'Arabic': 'AR', 'Hindi': 'HI', 'Vietnamese': 'VI', 'Turkish': 'TR', 'Polish': 'PL', 'Dutch': 'NL', 'Swedish': 'SV', 'Norwegian': 'NB', 'Danish': 'DA', 'Finnish': 'FI', 'Greek': 'EL', 'Hebrew': 'HE', 'Indonesian': 'ID', 'Romanian': 'RO', 'Hungarian': 'HU', 'Czech': 'CS', 'Slovak': 'SK', 'Bulgarian': 'BG', 'Serbian': 'SR', 'Croatian': 'HR', 'Ukrainian': 'UK', 'Lithuanian': 'LT', 'Latvian': 'LV', 'Estonian': 'ET', 'Slovenian': 'SL' };
    const LIBRE_LANG_MAP = { 'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it', 'Portuguese': 'pt', 'Chinese (Simplified)': 'zh', 'Chinese (Traditional)': 'zt', 'Japanese': 'ja', 'Korean': 'ko', 'Russian': 'ru', 'Arabic': 'ar', 'Hindi': 'hi', 'Vietnamese': 'vi', 'Turkish': 'tr', 'Polish': 'pl', 'Dutch': 'nl', 'Swedish': 'sv', 'Norwegian': 'nb', 'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hebrew': 'he', 'Indonesian': 'id', 'Filipino': 'tl', 'Romanian': 'ro', 'Hungarian': 'hu', 'Czech': 'cs', 'Slovak': 'sk', 'Bulgarian': 'bg', 'Serbian': 'sr', 'Croatian': 'hr', 'Ukrainian': 'uk' };
            const DEFAULT_GEMINI_MODELS = [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Latest Flagship · Fast & Literary)' },
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Flagship Hybrid & Fast)' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Official 2026 Recommended)' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Ultra Fast)' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Highest Free Quota)' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (High Quota & Fast)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep Literary Reasoning)' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' }
    ];

    const DEFAULT_DEEPSEEK_MODELS = [
      { id: 'deepseek-chat', name: 'DeepSeek V3 / V4 Chat (Ultra Fast & Cheap)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 / V4 Pro (Deep Reasoning)' }
    ];

    const estimateTokens = (text) => {
      if (!text) return 0;
      const cjkMatch = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g) || [];
      const nonCjk = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '');
      const words = nonCjk.trim().split(/\s+/).filter(Boolean);
      return Math.ceil(cjkMatch.length * 1.2 + words.length * 1.3);
    };

    const estimateCost = (tokens, modelId = 'gemini-3.7-flash', provider = 'gemini') => {
      let perMillion = 0.075;
      if (provider === 'deepseek') {
        if (modelId === 'deepseek-reasoner') perMillion = 0.55;
        else perMillion = 0.14;
      } else {
        if (modelId.includes('3.1-pro') || modelId.includes('pro')) perMillion = 1.25;
        else if (modelId.includes('flash-lite') || modelId.includes('8b')) perMillion = 0.0375;
        else if (modelId.includes('3.7-flash') || modelId.includes('3.6-flash') || modelId.includes('3.5-flash') || modelId.includes('3-flash')) perMillion = 0.075;
      }
      return ((tokens / 1000000) * perMillion).toFixed(4);
    };

    const calculateRealCost = (promptTokens, outputTokens, modelId = 'gemini-3.7-flash', provider = 'gemini') => {
      window.calculateRealCost = calculateRealCost;
      let inPerM = 0.075;
      let outPerM = 0.30;
      if (provider === 'deepseek') {
        if (modelId === 'deepseek-reasoner') {
          inPerM = 0.55;
          outPerM = 2.19;
        } else {
          inPerM = 0.14;
          outPerM = 0.28;
        }
      } else {
        if (modelId.includes('3.1-pro') || modelId.includes('pro')) {
          inPerM = 1.25;
          outPerM = 5.00;
        } else if (modelId.includes('flash-lite') || modelId.includes('8b')) {
          inPerM = 0.0375;
          outPerM = 0.15;
        } else {
          inPerM = 0.075;
          outPerM = 0.30;
        }
      }
      const cost = ((promptTokens / 1000000) * inPerM) + ((outputTokens / 1000000) * outPerM);
      return cost < 0.0001 && cost > 0 ? '$0.0001' : `$${cost.toFixed(4)}`;
    };

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

    // ═══════════════════════════════════════
    // BACKGROUND WEB WORKER BRIDGE (Zero UI Stutter)
    // ═══════════════════════════════════════
    let appWorker = null;
    let workerMsgId = 0;
    const workerCallbacks = new Map();

    const initAppWorker = () => {
      try {
        if (typeof window !== 'undefined' && window.Worker && !appWorker) {
          appWorker = new Worker('./worker.js');
          appWorker.onmessage = (e) => {
            const { id, success, error, ...rest } = e.data || {};
            if (workerCallbacks.has(id)) {
              const { resolve, reject } = workerCallbacks.get(id);
              workerCallbacks.delete(id);
              if (success) resolve(rest);
              else reject(new Error(error || 'Worker operation failed'));
            }
          };
          appWorker.onerror = (err) => {
            console.warn('Worker error:', err);
          };
        }
      } catch (e) {
        console.warn('Web Worker not available, falling back seamlessly to main thread:', e);
      }
    };

    const callWorker = (type, payload) => {
      return new Promise((resolve, reject) => {
        try {
          if (!appWorker) initAppWorker();
          if (!appWorker) return resolve(null);
          const id = ++workerMsgId;
          workerCallbacks.set(id, { resolve, reject });
          appWorker.postMessage({ id, type, payload });
        } catch (e) {
          resolve(null);
        }
      });
    };

    const formatDuration = (ms) => {
      if (!ms || ms <= 0) return '0.0s';
      const totalSec = ms / 1000;
      if (totalSec < 1) {
        return `${totalSec.toFixed(2)}s`;
      }
      if (totalSec < 60) {
        return `${totalSec.toFixed(1)}s`;
      }
      const totalMin = Math.floor(totalSec / 60);
      const remSec = Math.floor(totalSec % 60);
      if (totalMin < 60) {
        return `${totalMin}m ${remSec}s`;
      }
      const totalHours = Math.floor(totalMin / 60);
      const remMin = totalMin % 60;
      if (totalHours < 24) {
        return `${totalHours}h ${remMin}m ${remSec}s`;
      }
      const days = Math.floor(totalHours / 24);
      const remHours = totalHours % 24;
      return `${days}d ${remHours}h ${remMin}m`;
    };

    // ═══════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════
    const fetchRetry = async (url, opts, retries = 3, timeoutMs = 75000) => {
      let delay = 1500;
      for (let i = 0; i < retries; i++) {
        if (opts?.signal?.aborted) {
          const err = new Error('Translation paused.');
          err.name = 'AbortError';
          throw err;
        }

        const attemptController = new AbortController();
        let timeoutId = setTimeout(() => {
          attemptController.abort(new Error(`Request timed out (${Math.round(timeoutMs / 1000)}s).`));
        }, timeoutMs);

        const onParentAbort = () => {
          clearTimeout(timeoutId);
          attemptController.abort(opts.signal?.reason || new Error('Translation paused.'));
        };

        if (opts?.signal) {
          opts.signal.addEventListener('abort', onParentAbort, { once: true });
        }

        try {
          const fetchOpts = { ...opts, signal: attemptController.signal };
          const r = await fetch(url, fetchOpts);
          clearTimeout(timeoutId);
          if (opts?.signal) opts.signal.removeEventListener('abort', onParentAbort);

          if (r.status === 429) {
            const errText = await r.text().catch(() => '');
            const err = new Error(`Rate limit (429): ${errText.substring(0, 150)}`);
            err.status = 429;
            throw err;
          }
          if (r.status >= 500 && i < retries - 1) {
            if (opts?.signal?.aborted) {
              const err = new Error('Translation paused.');
              err.name = 'AbortError';
              throw err;
            }
            const msg = r.status === 503
              ? `Google server high demand (503). Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`
              : `API Error ${r.status}. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`;
            console.warn(msg);
            
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, delay);
              if (opts?.signal) {
                const onAbort = () => {
                  clearTimeout(timer);
                  const err = new Error('Translation paused.');
                  err.name = 'AbortError';
                  reject(err);
                };
                opts.signal.addEventListener('abort', onAbort, { once: true });
              }
            });
            delay *= 1.5;
            continue;
          }
          return r;
        } catch (e) {
          clearTimeout(timeoutId);
          if (opts?.signal) opts.signal.removeEventListener('abort', onParentAbort);

          if (opts?.signal?.aborted || (e.name === 'AbortError' && opts?.signal?.aborted)) {
            const err = new Error('Translation paused.');
            err.name = 'AbortError';
            throw err;
          }

          if (e.status === 429 || (e.message || '').includes('429')) {
            throw e;
          }

          if (i === retries - 1) throw e;
          const msg = e.message?.includes('timed out')
            ? `Request timed out. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`
            : `Connection busy. Retrying in ${(delay / 1000).toFixed(1)}s... (${i + 1}/${retries})`;
          console.warn(msg);
          
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, delay);
            if (opts?.signal) {
              const onAbort = () => {
                clearTimeout(timer);
                const err = new Error('Translation paused.');
                err.name = 'AbortError';
                reject(err);
              };
              opts.signal.addEventListener('abort', onAbort, { once: true });
            }
          });
          delay *= 1.5;
        }
      }
    };
    const wordCount = (t) => {
      if (!t) return 0;
      let count = 0;
      let inWord = false;
      for (let i = 0; i < t.length; i++) {
        const code = t.charCodeAt(i);
        if ((code >= 0x4e00 && code <= 0x9fa5) ||
            (code >= 0x3040 && code <= 0x30ff) ||
            (code >= 0xac00 && code <= 0xd7af)) {
          if (inWord) inWord = false;
          count++;
        } else if (
          (code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122) ||
          code === 95 ||
          (code > 127 && /\w/.test(t[i]))
        ) {
          if (!inWord) {
            inWord = true;
            count++;
          }
        } else {
          inWord = false;
        }
      }
      return count;
    };
    const charCount = t => t.length;
    const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

    // Work-Stealing Multi-Key Parallel Worker Pool: Zero-idle queue dispatcher
    const batchParallel = async (items, fn, concurrency = 3, signal = null) => {
      if (!items || items.length === 0) return [];
      const results = new Array(items.length);
      let nextIndex = 0;
      const numWorkers = Math.max(1, Math.min(concurrency, items.length));

      const workers = Array.from({ length: numWorkers }, async (_, workerId) => {
        if (workerId > 0) {
          // Stagger worker start times by 350ms to avoid simultaneous burst request limits
          await new Promise(r => setTimeout(r, workerId * 350));
        }
        while (nextIndex < items.length) {
          if (signal?.aborted) {
            const err = new Error('Translation paused.');
            err.name = 'AbortError';
            throw err;
          }
          const currentIndex = nextIndex++;
          const item = items[currentIndex];
          try {
            const res = await fn(item, currentIndex, workerId);
            results[currentIndex] = res;
          } catch (err) {
            if (signal?.aborted || err.name === 'AbortError') throw err;
            results[currentIndex] = { error: err.message || 'Unknown error' };
          }
        }
      });

      await Promise.all(workers);
      return results;
    };
    const cleanText = t => { let c = t.replace(/\r\n|\r/g, '\n'); c = c.replace(/[ \t]{2,}/g, ' '); c = c.replace(/(\n\s*){2,}/g, '\n\n'); return c.trim() };
    const copyText = async t => { await navigator.clipboard.writeText(t) };

    // Session State utilities
    const generateJobId = (text, isFile = false) => {
      // Simple hash to identify the document being translated
      let hash = 0; const s = isFile ? text : text.substring(0, 1000);
      for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
      return `job_${Math.abs(hash)}`;
    };

    const CHUNK_PAYLOAD_MAP = {
      turbo: 4500,
      large: 3800,
      medium: 2800,
      small: 1800
    };

    const splitChunks = (text, glossaryLen = 0, smartGlossary = true, preset = null) => {
      if (!text || typeof text !== 'string') return [];
      const activePreset = preset || (typeof localStorage !== 'undefined' ? localStorage.getItem('chunkSizePreset') : null) || 'turbo';
      const basePayload = CHUNK_PAYLOAD_MAP[activePreset] || 4500;
      const effectiveGlossaryLen = smartGlossary ? Math.min(glossaryLen, 1500) : glossaryLen;
      let max = basePayload - Math.min(PROMPT_OVERHEAD + effectiveGlossaryLen, 1800);
      // Ensure chunks never exceed 3500 chars so translated English output never breaches the 8192 token window
      if (max > 3500) max = 3500;
      if (max <= 0) max = 1800;
      const chunks = []; let rem = text;
      while (rem.length > 0) {
        if (rem.length <= max) { chunks.push(rem); break; }
        let sp = max;
        // Priority 1: Paragraph break (\n\n)
        let idx = rem.lastIndexOf('\n\n', max);
        if (idx !== -1 && idx >= max * 0.4) {
          sp = idx + 2;
        } else {
          // Priority 2: Single newline (\n)
          idx = rem.lastIndexOf('\n', max);
          if (idx !== -1 && idx >= max * 0.4) {
            sp = idx + 1;
          } else {
            // Priority 3: Sentence terminators
            const punctIndices = [
              rem.lastIndexOf('。\n', max),
              rem.lastIndexOf('。', max),
              rem.lastIndexOf('！\n', max),
              rem.lastIndexOf('！', max),
              rem.lastIndexOf('？\n', max),
              rem.lastIndexOf('？', max),
              rem.lastIndexOf('”\n', max),
              rem.lastIndexOf('”', max),
              rem.lastIndexOf('…\n', max),
              rem.lastIndexOf('…', max),
              rem.lastIndexOf('.\n', max),
              rem.lastIndexOf('.', max),
              rem.lastIndexOf('!\n', max),
              rem.lastIndexOf('!', max),
              rem.lastIndexOf('?\n', max),
              rem.lastIndexOf('?', max)
            ].filter(i => i >= max * 0.3);
            
            if (punctIndices.length > 0) {
              sp = Math.max(...punctIndices) + 1;
            } else {
              // Priority 4: Fallback to any newline or period in the first half rather than cutting mid-sentence
              const anyPunct = [
                rem.lastIndexOf('\n\n', max),
                rem.lastIndexOf('\n', max),
                rem.lastIndexOf('。', max),
                rem.lastIndexOf('.', max)
              ].filter(i => i > 0);
              if (anyPunct.length > 0) {
                sp = Math.max(...anyPunct) + 1;
              }
            }
          }
        }
        if (sp <= 0) sp = max;
        chunks.push(rem.substring(0, sp));
        rem = rem.substring(sp);
      }
      return chunks;
    };

    const formatGlossaryString = (str) => {
      if (!str || !str.trim()) return '';
      // Keep the glossary lossless. Formatting must never rewrite or discard rules, notes, aliases, or headings.
      return String(str).replace(/\r\n?/g, '\n').trim();
    };

    // ═══════════════════════════════════════
    // SMART DYNAMIC GLOSSARY FILTERING (LOSSLESS & SOURCE-AWARE)
    // ═══════════════════════════════════════
    const legacyFilterGlossaryForChunk = (rawGlossary, chunkText, isSmartEnabled = true) => {
      if (!rawGlossary || !rawGlossary.trim()) return '';
      if (!isSmartEnabled || !chunkText || !chunkText.trim()) return formatGlossaryString(rawGlossary);

      const lines = rawGlossary.split(/\r?\n/);
      const globalRules = [];
      const blocks = [];
      let currentBlock = null;
      let isGlobalSection = false;

      const lowerChunk = chunkText.toLowerCase();
      const chunkTokens = new Set(lowerChunk.match(/[a-z0-9_'-]{2,}/g) || []);

      const flushCurrentBlock = () => {
        if (currentBlock && currentBlock.lines.length > 0) {
          currentBlock.searchKeys = Array.from(new Set(currentBlock.searchKeys.filter(Boolean)));
          blocks.push(currentBlock);
          currentBlock = null;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          flushCurrentBlock();
          continue;
        }

        // Detect Global Translation Style / System Rules Sections (Always included in full)
        if (/^(?:#+\s*)?(?:[I|V|X]+\.|\d+\.)?\s*(?:SYSTEM TRANSLATION RULES|STYLE GUIDELINES|SYSTEM RULES|TRANSLATION RULES|GENERAL RULES|PROMPT RULES)/i.test(trimmed)) {
          isGlobalSection = true;
          flushCurrentBlock();
        } else if (/^(?:#+\s*)?(?:[I|V|X]+\.|\d+\.)?\s*(?:CORE TERMINOLOGY|VOCABULARY|CHARACTER DIRECTORY|CHARACTERS|COSMOLOGY|SEFIROT|EPOCHS|BEYONDER LAWS|LAWS|PATHWAYS|HONORIFIC NAMES|SEALED ARTIFACTS|MYTHICAL CREATURE|ORGANIZATIONS|OUTER DEITIES)/i.test(trimmed)) {
          isGlobalSection = false;
          flushCurrentBlock();
        }

        if (isGlobalSection) {
          globalRules.push(line);
          continue;
        }

        // Child/sub-lines (indented lines, honorific bullet quotes, multi-line definitions)
        const isChildLine = /^(\s{2,}|\t|\*|\+|\s*[-•]\s*["']|\s*["'])/.test(line) &&
          !/^[-*•]?\s*[\u4e00-\u9fa5]{1,10}\s*(?:->|:|=|\()/.test(trimmed) &&
          !/^[A-Z][a-zA-Z0-9\s'.-]{2,30}\s*-\s+[A-Za-z]/.test(trimmed);

        if (isChildLine && currentBlock) {
          currentBlock.lines.push(line);
          const subCjk = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{1,}/g);
          if (subCjk) currentBlock.searchKeys.push(...subCjk);
          const subArtifacts = trimmed.match(/\b\d+-\d+\b/g);
          if (subArtifacts) currentBlock.searchKeys.push(...subArtifacts);
        } else {
          flushCurrentBlock();

          currentBlock = {
            lines: [line],
            searchKeys: []
          };

          // 1. CJK character sequences
          const cjkMatches = trimmed.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]{1,}/g);
          if (cjkMatches) currentBlock.searchKeys.push(...cjkMatches);

          // 2. Parenthetical mappings (e.g. "- 扮演法 (Acting Method)", "- 卢卡·布鲁斯特 (Lucca Brewster)")
          const parenMatch = trimmed.match(/^[-*•#\d.\s]*([^(]+?)\s*\(([^)]+)\)/);
          if (parenMatch) {
            const left = parenMatch[1].replace(/^[-*•#\d.\s]+/, '').trim();
            const right = parenMatch[2].trim();
            if (left) {
              left.split(/[/|,]/).forEach(k => {
                const c = k.trim();
                if (c) currentBlock.searchKeys.push(c);
              });
            }
            if (right) {
              right.split(/[/|,]/).forEach(k => {
                const c = k.trim();
                if (c) currentBlock.searchKeys.push(c);
              });
            }
          }

          // 3. Key-value mapping left-side & right-side aliases (e.g. "克莱恩·莫雷蒂 -> Klein Moretti", "A先生 -> Mr. A")
          if (trimmed.includes('->') || trimmed.includes('=') || (trimmed.includes(':') && !trimmed.startsWith('http'))) {
            const parts = trimmed.split(/->|=|:(?!\/\/)/);
            if (parts.length >= 2) {
              const leftKey = parts[0].replace(/^[-*•#\d.\s]+/, '').trim();
              if (leftKey && leftKey.length >= 1) {
                leftKey.split(/[/|,]/).forEach(k => {
                  const cleaned = k.trim().replace(/\(.*\)/, '').trim();
                  if (cleaned) currentBlock.searchKeys.push(cleaned);
                });
              }

              const parenMatches = parts[1].match(/\(([^)]+)\)/g);
              if (parenMatches) {
                parenMatches.forEach(p => {
                  const inner = p.replace(/[()]/g, '');
                  inner.split(/[/|,]/).forEach(alias => {
                    const cleanAlias = alias.trim();
                    if (cleanAlias.length >= 2) currentBlock.searchKeys.push(cleanAlias);
                  });
                });
              }
            }
          }

          // 4. Character Directory entries (e.g. "- Alger Wilson - Tyrant / Hanged Man")
          const charDirMatch = trimmed.match(/^[-*•]?\s*([A-Za-z\s'.-]+)\s*-\s*(.+)$/);
          if (charDirMatch) {
            const name = charDirMatch[1].trim();
            if (name && name.length >= 2 && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(name)) {
              currentBlock.searchKeys.push(name);
            }
          }

          // 5. Standalone English named items / bullet items (e.g. "- Quill of Alzuhod", "- Sefirah Castle")
          const standaloneItem = trimmed.match(/^[-*•]?\s*([A-Za-z0-9\s'.-]{3,50})$/);
          if (standaloneItem) {
            const item = standaloneItem[1].trim();
            if (item && !/^(Sequence|Grade|Pathway|Authorities|Counters|Formula|Epoch|Pillars?)$/i.test(item)) {
              currentBlock.searchKeys.push(item);
            }
          }

          // 6. Sealed Artifact Numbers (e.g. 0-08, 1-42, 2-166, 0-01)
          const artMatches = trimmed.match(/\b\d+-\d+\b/g);
          if (artMatches) currentBlock.searchKeys.push(...artMatches);

          // 7. Sequence Names (e.g. "Sequence 9: Seer", "Sequence 4: Bizarro Sorcerer")
          const seqMatch = trimmed.match(/Sequence\s+\d+:\s*([A-Za-z\s()'-]+)/i);
          if (seqMatch) {
            const seqName = seqMatch[1].replace(/\(.*\)/, '').trim();
            if (seqName && seqName.length >= 2) currentBlock.searchKeys.push(seqName);
          }

          // 8. Honorific / Deity headers (e.g. "- The Fool:", "- Evernight Goddess:")
          const deityMatch = trimmed.match(/^[-*•]?\s*([A-Za-z\s'.-]+):$/);
          if (deityMatch) {
            const dName = deityMatch[1].trim();
            if (dName && dName.length >= 2) currentBlock.searchKeys.push(dName);
          }
        }
      }

      flushCurrentBlock();

      const matchedBlocks = [];
      for (const block of blocks) {
        if (!block.searchKeys || block.searchKeys.length === 0) continue;

        const isMatch = block.searchKeys.some(key => {
          if (!key) return false;
          if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(key)) {
            return chunkText.includes(key);
          }
          const lowerKey = key.toLowerCase();
          if (lowerKey.length <= 4) {
            return chunkTokens.has(lowerKey) || lowerChunk.includes(lowerKey);
          }
          return lowerChunk.includes(lowerKey);
        });

        if (isMatch) {
          matchedBlocks.push(block.lines.join('\n'));
        }
      }

      let result = '';
      if (globalRules.length > 0) {
        result += '=== SYSTEM TRANSLATION RULES & STYLE GUIDELINES ===\n' + globalRules.join('\n').trim() + '\n\n';
      }

      if (matchedBlocks.length > 0) {
        result += '=== RELEVANT CHAPTER TERMINOLOGY & GLOSSARY ===\n' + matchedBlocks.join('\n\n');
      }

      return result.trim() || (globalRules.length > 0 ? globalRules.join('\n').trim() : formatGlossaryString(rawGlossary));
    };

    // Precision Lossless dynamic glossary selection.
    const filterGlossaryForChunk = (rawGlossary, chunkText, isSmartEnabled = true) => {
      if (!rawGlossary || !rawGlossary.trim()) return '';
      const originalGlossary = String(rawGlossary).replace(/\r\n?/g, '\n').trim();
      if (!isSmartEnabled || !chunkText || !chunkText.trim()) return originalGlossary;

      const lines = originalGlossary.split('\n');
      const globalRules = [];
      const blocks = [];
      let currentBlock = null;
      let currentSectionHeading = '';
      let isGlobalSection = false;

      const topSectionPattern = /^(?:#+\s*)?[IVXLCDM]+\.\s+\S/i;
      const globalSectionPattern = /^(?:#+\s*)?(?:I\.)?\s*(?:SYSTEM TRANSLATION RULES|STYLE GUIDELINES|SYSTEM RULES|TRANSLATION RULES|GENERAL RULES|PROMPT RULES)/i;
      const alwaysIncludeSectionPattern = /\b(?:RULES?|GUIDELINES?|CONTINUITY|FORMATTING|DO\s+NOT)\b/i;

      const genericKeys = new Set([
        'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'god', 'goddess', 'he', 'her', 'his',
        'human', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'pathway', 'sequence', 'she', 'the',
        'this', 'to', 'unknown', 'was', 'with', 'year', 'ability', 'abilities', 'authority', 'authorities',
        'appearance', 'aliases', 'counters', 'formula', 'history', 'symbolism', 'physical', 'enhanced', 'enhancement',
        'notes', 'note', 'chapter', 'chapters', 'volume', 'volumes', 'vol', 'vols', 'form', 'forms', 'grade', 'level', 'item', 'items'
      ]);

      const normalizeKey = value => String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[\u2019\u2018]/g, "'")
        .replace(/[^a-z0-9\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const keyVariants = key => {
        const raw = String(key || '').trim();
        if (!raw) return [];
        if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(raw)) return [raw];
        const normalized = normalizeKey(raw);
        if (!normalized) return [];
        const variants = [normalized];
        const withoutTitle = normalized.replace(/^(?:mr|mrs|ms|miss|madam|madame|the|church\s+of\s+the|church\s+of)\s+/, '').trim();
        if (withoutTitle && withoutTitle !== normalized && withoutTitle.length >= 3) variants.push(withoutTitle);
        if (normalized.includes(' ')) {
          const words = normalized.split(' ').filter(Boolean);
          if (words.length <= 3 && words.every(word => word.length >= 3 && !genericKeys.has(word))) {
            words.forEach(word => variants.push(word));
          }
        }
        return Array.from(new Set(variants)).filter(v => v.length >= 2 && !genericKeys.has(v));
      };

      const bulletRegex = /^(?:[-*+\u2022#\s]+|(?:\d+|[a-zA-Z])[.)]\s+)+/;

      const addTermKeys = (target, value) => {
        const clean = String(value || '').replace(bulletRegex, '').trim();
        if (!clean) return;
        const cjkMatches = (clean.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af\uff10-\uff19\uff21-\uff3a\uff41-\uff5aa-zA-Z0-9·・_-]+/g) || [])
          .filter(token => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(token));
        cjkMatches.forEach(key => {
          target.push(key);
          key.split(/[·・]/).filter(part => part.length >= 2).forEach(part => target.push(part));
        });
        clean.split(/[/|,;]+/)
          .map(part => part.replace(/\([^)]*\)/g, '').replace(/[\[\]]/g, '').trim())
          .filter(part => part && part.length <= 100)
          .forEach(part => keyVariants(part).forEach(variant => target.push(variant)));
      };

      const addLineSearchKeys = (target, line) => {
        const trimmed = String(line || '').trim();
        if (!trimmed) return;
        const content = trimmed.replace(bulletRegex, '').trim();
        if (!content) return;
        const mapping = content.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)\s*$/);
        if (mapping) {
          addTermKeys(target, mapping[1]);
          let targetClean = mapping[2];
          const hashIdx = targetClean.indexOf('#');
          if (hashIdx !== -1) targetClean = targetClean.slice(0, hashIdx).trim();
          const dSlashIdx = targetClean.indexOf('//');
          if (dSlashIdx !== -1) targetClean = targetClean.slice(0, dSlashIdx).trim();
          addTermKeys(target, targetClean);
        } else {
          const dashEntry = content.match(/^(.+?)\s+-\s+.+$/);
          const colonEntry = content.match(/^(.+?)\s*:\s*(.*)$/);
          addTermKeys(target, dashEntry ? dashEntry[1] : (colonEntry ? colonEntry[1] : content));
          if (colonEntry?.[2] && colonEntry[2].length <= 80) {
            let rightClean = colonEntry[2];
            const hashIdx = rightClean.indexOf('#');
            if (hashIdx !== -1) rightClean = rightClean.slice(0, hashIdx).trim();
            addTermKeys(target, rightClean);
          }
          if (dashEntry?.[2] && dashEntry[2].length <= 80) {
            let rightClean = dashEntry[2];
            const hashIdx = rightClean.indexOf('#');
            if (hashIdx !== -1) rightClean = rightClean.slice(0, hashIdx).trim();
            addTermKeys(target, rightClean);
          }
        }
        (content.match(/\b\d+-\d+\b/g) || []).forEach(number => target.push(number));
      };

      const flushCurrentBlock = () => {
        if (currentBlock && currentBlock.lines.length > 0) {
          currentBlock.searchKeys = Array.from(new Set(currentBlock.searchKeys.filter(Boolean)));
          blocks.push(currentBlock);
        }
        currentBlock = null;
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (isGlobalSection) globalRules.push('');
          flushCurrentBlock();
          continue;
        }
        if (topSectionPattern.test(trimmed)) {
          flushCurrentBlock();
          currentSectionHeading = line;
          const hasDictionaryName = /\b(?:PHRASES?|TERMS?|VOCABULARY|DICTIONARY|NAMES?|CHARACTERS?|PERSONAS?|LOCATIONS?|NOTES?)\b/i.test(trimmed);
          isGlobalSection = (globalSectionPattern.test(trimmed) || alwaysIncludeSectionPattern.test(trimmed)) && !hasDictionaryName;
          if (isGlobalSection) globalRules.push(line);
          continue;
        }

        // Even within a global section, any line with a mapping arrow (A -> B or A => B) is a dictionary entry, NOT a global meta-rule!
        const isMappingLine = /^(?:[-*+\u2022\s]*)?.+?\s*(?:->|=>|=)\s*.+$/.test(trimmed);
        if (isGlobalSection && !isMappingLine) {
          globalRules.push(line);
          continue;
        }

        const isSubIndentedNote = currentBlock && (
          /^\s{2,}[*+\u2022-]\s+/.test(line) ||
          /^\s{2,}\*/.test(line)
        );

        if (isSubIndentedNote) {
          currentBlock.lines.push(line);
          if (trimmed.length <= 120) addLineSearchKeys(currentBlock.searchKeys, line);
        } else {
          flushCurrentBlock();
          currentBlock = { lines: [line], searchKeys: [], sectionHeading: currentSectionHeading };
          addLineSearchKeys(currentBlock.searchKeys, line);
        }
      }
      flushCurrentBlock();

      const chunkForMatch = normalizeKey(chunkText);
      const matchesKeyInText = (key, text, normalizedText) => {
        if (!key) return false;
        if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(key)) return text.includes(key);
        return keyVariants(key).some(variant => {
          const escaped = variant.replace(/[.*+?^()|[\]\\]/g, '\\$&');
          return new RegExp('(?:^| )' + escaped + '(?:$| )', 'i').test(normalizedText);
        });
      };

      // Direct precision matching against chunk text
      const selectedBlocks = new Set();
      for (const block of blocks) {
        for (const key of block.searchKeys) {
          if (matchesKeyInText(key, chunkText, chunkForMatch)) {
            selectedBlocks.add(block);
            break;
          }
        }
      }

      // Assemble Lossless Formatted Output
      const output = [];
      const seenSections = new Set();
      const globalText = globalRules.join('\n').trim();
      if (globalText) output.push(globalText);

      for (const block of blocks) {
        if (!selectedBlocks.has(block)) continue;
        if (block.sectionHeading && !seenSections.has(block.sectionHeading)) {
          output.push(block.sectionHeading);
          seenSections.add(block.sectionHeading);
        }
        output.push(block.lines.join('\n'));
      }

      return output.join('\n\n').trim() || '';
    };

    const calculateTokenBreakdown = (promptTokens, components) => {
      if (!promptTokens || promptTokens <= 0 || !components) {
        return {
          sourceTokens: 0,
          glossaryTokens: 0,
          genderTokens: 0,
          contextTokens: 0,
          systemTokens: 0,
          sourcePct: '0.0',
          glossaryPct: '0.0',
          genderPct: '0.0',
          contextPct: '0.0',
          systemPct: '0.0'
        };
      }

      const estSource = Math.max(0, components.estSource || 0);
      const estGlossary = Math.max(0, components.estGlossary || 0);
      const estGender = Math.max(0, components.estGender || 0);
      const estContext = Math.max(0, components.estContext || 0);
      const estSystem = Math.max(1, components.estSystem || 100);

      const totalEst = estSource + estGlossary + estGender + estContext + estSystem;

      let sourceTokens = Math.round(promptTokens * (estSource / totalEst));
      let glossaryTokens = Math.round(promptTokens * (estGlossary / totalEst));
      let genderTokens = Math.round(promptTokens * (estGender / totalEst));
      let contextTokens = Math.round(promptTokens * (estContext / totalEst));

      let systemTokens = promptTokens - (sourceTokens + glossaryTokens + genderTokens + contextTokens);
      if (systemTokens < 0) {
        sourceTokens = Math.max(0, sourceTokens + systemTokens);
        systemTokens = promptTokens - (sourceTokens + glossaryTokens + genderTokens + contextTokens);
      }

      const getPct = (tok) => promptTokens > 0 ? ((tok / promptTokens) * 100).toFixed(1) : '0.0';

      return {
        sourceTokens,
        glossaryTokens,
        genderTokens,
        contextTokens,
        systemTokens,
        sourcePct: getPct(sourceTokens),
        glossaryPct: getPct(glossaryTokens),
        genderPct: getPct(genderTokens),
        contextPct: getPct(contextTokens),
        systemPct: getPct(systemTokens)
      };
    };

    const buildPromptResult = (text, srcLang, tgtLang, glossary, instructions, context, smartGlossary = true, needContextUpdate = false, genderLocks = null) => {
      const srcDisplay = srcLang && srcLang !== 'Auto-detect' ? srcLang : 'the detected source language';
      const tgtDisplay = tgtLang || 'English';

      const promptHeader = `You are a direct translator translating the exact supplied text from ${srcDisplay} into ${tgtDisplay}. The input may be a single sentence, dialogue, metadata, or long-form fiction.\n\n` +
        `TRANSLATION GUIDELINES:\n` +
        `0. Translate ONLY the text inside RAW TEXT TO TRANSLATE. Do not continue it, rewrite it, adapt it, summarize it, or replace it with invented content. Stop when the supplied text ends.\n` +
        `1. Translate every supplied sentence, paragraph, heading, dialogue line, and event. Do not omit, merge, or summarize.\n` +
        `2. Preserve the source meaning, relationships, chronology, voice, and level of formality. Use natural ${tgtDisplay} rather than word-for-word phrasing.\n` +
        `3. Use a glossary mapping only when its source term actually occurs in RAW TEXT TO TRANSLATE. Never import a character, setting, event, example, or lore detail from the glossary.\n` +
        `4. Preserve headings, paragraph breaks, dialogue boundaries, and scene breaks. Do not add notes, commentary, or text that is not a translation of the supplied source.\n` +
        `5. Return only the translation.\n\n`;

      let p = `${promptHeader}=== RAW TEXT TO TRANSLATE ===\n${text}\n=== END RAW TEXT TO TRANSLATE ===\n\n`;

      let injectedGlossaryText = '';
      const filteredGlossary = filterGlossaryForChunk(glossary, text, smartGlossary);
      if (filteredGlossary.trim()) {
        try {
          const matchedTerms = filteredGlossary
            .split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.trim().replace(/^-\s*/, ''));
          const isVerbose = typeof localStorage !== 'undefined' && localStorage.getItem('telemetry_verbose') === 'true';
          const tokensSaved = Math.max(0, Math.round((glossary.length - filteredGlossary.length) / 3.8));
          window.telemetryLog?.('SMART_GLOSSARY', `Smart Glossary injected ${matchedTerms.length} matched terms into prompt (~${tokensSaved} tokens saved)`, {
            matchedCount: matchedTerms.length,
            matchedTerms: isVerbose ? matchedTerms : matchedTerms.slice(0, 40),
            smartEnabled: Boolean(smartGlossary),
            totalGlossaryChars: glossary.length,
            injectedChars: filteredGlossary.length,
            tokensSavedApprox: tokensSaved
          });
          if (isVerbose) {
            window.telemetryLog?.('PROMPT_INSPECT', 'Raw terminology guide sent to Gemini for chunk', {
              injectedGuide: filteredGlossary
            });
          }
        } catch(e) {}
        injectedGlossaryText = filteredGlossary.trim();
        p = `=== TERMINOLOGY GUIDE (REFERENCE ONLY) ===\nThe following guide supplies terminology and style constraints. It is not story content. Do not reproduce its examples, notes, character lists, or lore unless the same information is present in the raw text.\n\n${filteredGlossary.trim()}\n=== END TERMINOLOGY GUIDE ===\n\n` + p;
      } else if (glossary && glossary.trim()) {
        try {
          window.telemetryLog?.('SMART_GLOSSARY', 'Smart Glossary: 0 terms matched in chunk (all non-occurring lore filtered out to save tokens)', {
            totalGlossaryChars: glossary.length,
            smartEnabled: Boolean(smartGlossary)
          });
        } catch(e) {}
      }

      // ⚥ Anti-Pronoun Drift: Automatically extract & lock genders for characters in this scene
      const combinedLocks = { ...(genderLocks && typeof genderLocks === 'object' ? genderLocks : {}) };
      const fromGlossaryCharacters = new Set();
      if (filteredGlossary && filteredGlossary.trim()) {
        const fLines = filteredGlossary.split('\n');
        for (const line of fLines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
          if (/^[-*+\s]*(?:Legend|Example|Note|Rule|Correct|Incorrect):/i.test(trimmed)) continue;
          const m = trimmed.match(/^(?:-\s*)?(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
          if (m) {
            const target = m[2];
            let gen = null;
            if (/\((?:context|dynamic|m\/f)\)|\[(?:context|dynamic|m\/f)\]/i.test(target) || /\b(?:m\/f|dynamic)\b/i.test(target)) {
              gen = 'context';
            } else if (/\((?:female|f)\)|\[(?:female|f)\]|\b(?:female|she\/her)\b/i.test(target)) {
              gen = 'female';
            } else if (/\((?:male|m)\)|\[(?:male|m)\]|\b(?:male|he\/him)\b/i.test(target)) {
              gen = 'male';
            }
            if (gen) {
              const cleanName = target.replace(/\s*(?:\([^)]*\)|\[[^\]]*\]|#.*$)/g, '').trim();
              if (cleanName && cleanName.length <= 40 && !/^(?:do not|never|use|always|note|see)\b/i.test(cleanName) && !combinedLocks[cleanName]) {
                combinedLocks[cleanName] = gen;
                fromGlossaryCharacters.add(cleanName);
              }
            }
          }
        }
      }

      const lockEntries = Object.entries(combinedLocks).filter(([k, v]) => k && v && String(k).trim());
      let genderLockRulesText = '';
      if (lockEntries.length > 0) {
        let activeLocks = lockEntries;
        if (text && text.trim()) {
          const lowerText = text.toLowerCase();
          const aliasMap = new Map();
          if (glossary && typeof glossary === 'string') {
            const gLines = glossary.split(/\r?\n/);
            for (const gl of gLines) {
              if (!gl || gl.startsWith('#') || gl.startsWith('//')) continue;
              const m = gl.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
              if (m) {
                const s = m[1].replace(/#.*$/, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
                const t = m[2].replace(/#.*$/, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '').trim();
                if (s && t) {
                  if (!aliasMap.has(s)) aliasMap.set(s, new Set());
                  if (!aliasMap.has(t)) aliasMap.set(t, new Set());
                  aliasMap.get(s).add(t);
                  aliasMap.get(t).add(s);
                }
              }
            }
          }

          activeLocks = lockEntries.filter(([name]) => {
            if (fromGlossaryCharacters.has(name)) return true;
            const clean = String(name).trim();
            if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(clean)) {
              if (text.includes(clean)) return true;
            } else {
              if (lowerText.includes(clean.toLowerCase())) return true;
              const parts = clean.split(/\s+/).filter(w => w.length >= 4 && !/^(?:miss|mister|lady|lord|sir|madame|king|queen|saint|emperor)$/i.test(w));
              for (const part of parts) {
                if (lowerText.includes(part.toLowerCase())) return true;
              }
            }
            const aliases = aliasMap.get(clean);
            if (aliases) {
              for (const a of aliases) {
                if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(a)) {
                  if (text.includes(a)) return true;
                } else {
                  if (lowerText.includes(a.toLowerCase())) return true;
                }
              }
            }
            return false;
          });
        }

        if (activeLocks.length > 0) {
          const rules = activeLocks.map(([name, gender]) => {
            const gLower = String(gender).toLowerCase();
            const isContext = gLower.includes('context') || gLower.includes('m/f') || gLower.includes('dynamic') || gLower.includes('both');
            if (isContext) {
              return `- ${String(name).trim()}: CONTEXT-DEPENDENT / DYNAMIC (M/F). This character changes/transitions biological gender or form across the narrative (e.g. sex-change potions, shape-shifting, dual avatars). Translate pronouns dynamically ('he/him' when presenting in male form, 'she/her' when presenting in female form) based strictly on active scene context. Do NOT force a single fixed pronoun.`;
            }
            const isFemale = gLower.includes('female') || gLower.includes('she');
            const isMale = gLower.includes('male') || gLower.includes('he');
            const pronouns = isFemale ? 'she / her / hers / herself' : isMale ? 'he / him / his / himself' : gender;
            return `- ${String(name).trim()}: ${gender} (${pronouns}). Never use opposite pronouns for this character.`;
          }).join('\n');
          genderLockRulesText = rules;
          p = `=== GENDER LOCK PROTOCOL (ANTI-PRONOUN DRIFT) ===\nCRITICAL DIRECTIVE: You MUST maintain the exact gender pronouns for the following characters. Do not confuse or swap pronouns under any circumstances:\n${rules}\n=== END GENDER LOCK PROTOCOL ===\n\n` + p;

          try {
            const tokensSaved = Math.max(0, (lockEntries.length - activeLocks.length) * 15);
            window.telemetryLog?.('GENDER_LOCK', `Smart Prompt injected ${activeLocks.length} scene locks (${lockEntries.length - activeLocks.length} non-scene locks filtered out to save ~${tokensSaved} tokens)`, {
              chunkCharactersPresent: activeLocks.map(([cName, cGen]) => `${cName} [${cGen.toUpperCase()}]`),
              activeLocksCount: activeLocks.length,
              totalDatabaseLocks: lockEntries.length,
              tokensSavedApprox: tokensSaved
            });
          } catch(e) {}
        }
      }

      const culturalFootnotesActive = typeof localStorage !== 'undefined' && localStorage.getItem('culturalFootnotesEnabled') !== 'false';
      if (culturalFootnotesActive) {
        const footnoteRule = `=== CULTURAL CONTEXT & FOOTNOTES PROTOCOL ===\nWhen culturally specific idioms, cultivation lore, puns, honorific subtleties, or historical terms appear, append an explanatory footnote at the very end of the chapter under "--- FOOTNOTES ---" using standard format "[¹ Note: explanation]" or "[² Note: explanation]", and place the superscript marker "[¹]" immediately after the term in the translated text.\n=== END FOOTNOTES PROTOCOL ===\n\n`;
        p = footnoteRule + p;
      }

      let instructionsText = '';
      if (instructions && instructions.trim()) {
        instructionsText = instructions.trim();
        p = `=== CUSTOM TRANSLATION INSTRUCTIONS ===\n${instructionsText}\n=== END CUSTOM INSTRUCTIONS ===\n\n` + p;
      }

      let contextText = '';
      if (context !== undefined && context && context.trim()) {
        contextText = context.trim();
        p = `=== PREVIOUS CHAPTER CONTEXT ===\n${contextText}\n=== END CONTEXT ===\n\nUse this context to maintain strict continuity in character names, gender pronouns (he/she), and tone.\n\n` + p;
      }

      const trailer = needContextUpdate
        ? `Provide ONLY the pure ${tgtDisplay} translation${culturalFootnotesActive ? ' (with any trailing --- FOOTNOTES --- section if cultural terms occurred)' : ''}. Never include the original source text or bilingual side-by-side lines. Followed EXACTLY by the delimiter "\n---CONTEXT_UPDATE---\n", followed by a brief telegraphic continuity note (max 30 words: cast [name/gender], location, immediate tone).`
        : `Provide ONLY the pure ${tgtDisplay} translated text${culturalFootnotesActive ? ' (including trailing --- FOOTNOTES --- section if cultural terms occurred)' : ' without preamble, commentary, or markdown notes'}.`;
      p += trailer;

      const estSource = estimateTokens(text || '');
      const estGlossary = estimateTokens(injectedGlossaryText);
      const estGender = estimateTokens(genderLockRulesText);
      const estContext = estimateTokens(contextText);
      const estInstructions = estimateTokens(instructionsText);
      const systemOverhead = promptHeader + trailer + ' Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.';
      const estSystem = estimateTokens(systemOverhead) + estInstructions;

      return {
        prompt: p,
        components: {
          estSource,
          estGlossary,
          estGender,
          estContext,
          estSystem
        }
      };
    };

    const buildPrompt = (text, srcLang, tgtLang, glossary, instructions, context, smartGlossary = true, needContextUpdate = false, genderLocks = null) => {
      return buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks).prompt;
    };

    const cleanNovelProse = (typeof window !== 'undefined' && window.cleanNovelProse)
      ? window.cleanNovelProse
      : (text => {
          if (!text) return '';
          const placeholders = [];
          let t = text.replace(/(?:!\[[^\]]*\]\([^\)]+\)|<img\b[^>]*>|https?:\/\/[^\s<>"'()]+)/gi, (match) => {
            const ph = `__PROTECTED_TOKEN_${placeholders.length}__`;
            placeholders.push(match);
            return ph;
          });

          t = (typeof window !== 'undefined' && window.decodeHtmlEntities)
            ? window.decodeHtmlEntities(t)
            : t.replace(/&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([a-zA-Z]+));/g, '');
          t = t.replace(/\u00a0/g, ' ');
          t = t.replace(/^(\s*)\*([A-Za-z0-9!?,.\s'-]{1,30})\*(\s*)$/gm, '$1$2$3');
          t = t.replace(/^\s*(?:Previous Chapter|Next Chapter|Table of Contents|Prev|Next|TOC|Back to Top|Share this:?|Like this:?|Related|Loading\.\.\.|Leave a (?:Reply|Comment)|Click here to .+)\s*$/gim, '');
          t = t.replace(/^\s*(?:#{1,6}\s*)?Chapter\s*\[(?:number|\d+)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
          t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:chapter|number)\](?:\s*[:\-–—]\s*\[(?:name|title)\])?\s*$/gim, '');
          t = t.replace(/^\s*(?:#{1,6}\s*)?\[(?:Chapter\s*Name|Chapter\s*Title|Name|Title)\]\s*$/gim, '');
          t = t.replace(/^\s*---\s*Page\s*End\s*---\s*$/gim, '');
          t = t.replace(/^\s*(?:Advertisements?|Sponsored|Share on (?:Facebook|Twitter|Reddit)|Follow us on .+|Join our Discord.+|Support (?:us|me) on .+|Donate .+|Patreon .+|Buy me a coffee.+)\s*$/gim, '');
          t = t.replace(/<\/?(?:div|span|br|a|script|style|iframe|button|input|form|nav|header|footer|aside|section|figure|figcaption)[^>]*>/gi, '');
          t = t.replace(/\n{3,}/g, '\n\n');
          t = t.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
          t = t.replace(/"([^"]*?)"/g, '\u201c$1\u201d');
          t = t.replace(/(\w)'(\w)/g, '$1\u2019$2');
          t = t.replace(/---?/g, '\u2014');
          t = t.replace(/\.{3,}/g, '\u2026');
          t = t.replace(/([\u201c\u2018"])\s+(?=[A-Za-z])/g, '$1');
          t = t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
          t = t.replace(/([.!?\u2026]+)(["'\u201d\u2019)]?)(?=[A-Za-z])/g, '$1$2 ');

          placeholders.forEach((token, idx) => {
            t = t.replace(`__PROTECTED_TOKEN_${idx}__`, token);
          });

          return t.trim();
        });
    if (typeof window !== 'undefined' && !window.cleanNovelProse) window.cleanNovelProse = cleanNovelProse;

    const parseTranslationOutput = (rawText, context, usage = null) => {
      let text = cleanNovelProse(rawText || '');
      let newContext = context;
      if (text.includes('CONTEXT_UPDATE')) {
        const parts = text.split(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
        const mainBody = parts[0].trim();
        if (mainBody.length > 0) {
          text = cleanNovelProse(mainBody);
          newContext = parts.slice(1).join('\n').trim();
        } else if (parts.length > 1 && parts[1].trim().length > 0) {
          text = cleanNovelProse(parts.slice(1).join('\n').trim());
        }
      } else {
        text = text.trim();
      }
      return { text, newContext, usage };
    };

    const isLikelyHeadingOnlyTranslation = (value, sourceLength) => {
      const normalized = cleanNovelProse(value || '').trim();
      if (!normalized || sourceLength <= 300) return !normalized;
      const lines = normalized.split(/\r?\n+/).map(line => line.trim()).filter(Boolean);
      if (!lines.length || lines.length > 8) return false;
      return lines.every(line => {
        const plain = line.replace(/^#{1,6}\s*/, '').trim();
        return /^(?:preface|prologue|afterword|epilogue|postscript)$/i.test(plain) ||
          /^chapter\b/i.test(plain) || /^\[[^\]]+\]/.test(plain);
      });
    };

    const translateGemini = async (text, { apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, strictModel = true, genderLocks = null, rotateApiKey = null }) => {
      if (!apiKey) throw new Error('Gemini API key required.');
      const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
      ];
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: {
          parts: [{
            text: 'Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.'
          }]
        },
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        safetySettings
      };
      // Thinking Control: Only pass thinkingConfig when thinking is ON, or for thinking-native models (like 3.7 / 2.5).
      // Standard models (like gemini-3.5-flash-lite) reject thinkingBudget: 0 with 400 Invalid argument.
      const isThinkingModel = /gemini-(?:3\.7|2\.5)/i.test(model);
      if (enableThinking) {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 2048 };
      } else if (isThinkingModel) {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      const apiStart = performance.now();
      window.AppLogger?.log('info', 'GeminiAPI', `Outbound request to ${model} (Key: ${maskKey(apiKey)}, Chars: ${text.length}, Thinking: ${enableThinking ? 'ON' : 'OFF'}, Strict: ${strictModel ? 'ON' : 'OFF'})`);
      const reqHeaders = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
      let r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      if (!r.ok) {
        const errBody = await r.clone().text().catch(() => '');
        let errSnippet = '';
        try {
          const errJson = JSON.parse(errBody);
          errSnippet = errJson?.error?.message || errBody.slice(0, 160);
        } catch(e) { errSnippet = errBody.slice(0, 160); }
        window.AppLogger?.log('warn', 'GeminiAPI', `Response ${r.status} ${r.statusText} in ${Math.round(performance.now() - apiStart)}ms`, errSnippet);
      } else {
        window.AppLogger?.log('info', 'GeminiAPI', `Response 200 OK in ${Math.round(performance.now() - apiStart)}ms`);
      }

      // Automatic key rotation on HTTP 429 quota exhaustion
      if (!r.ok && r.status === 429) {
        const rotFn = rotateApiKey || (typeof window !== 'undefined' ? window.rotateApiKey : null);
        if (typeof rotFn === 'function') {
          const nextKey = rotFn(apiKey);
          if (nextKey && nextKey !== apiKey) {
            console.warn(`Gemini 429 quota/rate limit hit. Auto-rotated key from ${maskKey ? maskKey(apiKey) : 'key'} to ${maskKey ? maskKey(nextKey) : 'nextKey'}. Retrying translation...`);
            return translateGemini(text, {
              apiKey: nextKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks, rotateApiKey: rotFn
            });
          }
        }
      }

      if (!r.ok && r.status === 400 && payload.generationConfig?.thinkingConfig) {
        delete payload.generationConfig.thinkingConfig;
        r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      }
      if (!r.ok && r.status === 400 && payload.system_instruction) {
        delete payload.system_instruction;
        r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      }
      // If server is overloaded (503/500), be patient: retry with the SAME chosen model first (1-2 quick retries)
      if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
        console.warn(`Model ${model} returned ${r.status} (server busy). Waiting 2s before retrying ${model}...`);
        await new Promise(res => setTimeout(res, 2000));
        r = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
        
        // Second retry on the same model if still busy
        if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
          console.warn(`Model ${model} still busy. Second attempt after 2.5s...`);
          await new Promise(res => setTimeout(res, 2500));
          r = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
        }
      }

      // ONLY switch to fallback if strictModel is disabled AND (model is 404 or sustained 503)
      if (!strictModel && !r.ok && (r.status === 404 || r.status === 503) && model !== 'gemini-3.5-flash-lite') {
        const fallbackModel = 'gemini-3.5-flash-lite';
        const reason = r.status === 404 ? 'Model Not Found / Deprecated' : 'Sustained Server Overload (503)';
        console.warn(`Model ${model} unavailable (${r.status}) after retries. Falling back to ${fallbackModel}...`);
        if (typeof window !== 'undefined' && window.notifyModelChange) {
          window.notifyModelChange(model, fallbackModel, reason);
        }
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
        r = await fetchRetry(fallbackUrl, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      }
      if (!r || !r.ok) { const b = await r?.text().catch(() => '') || ''; throw new Error(`Gemini API error ${r?.status || 'network'}: ${b.substring(0, 200)}`); }
      const j = await r.json();
      const candidateParts = j?.candidates?.[0]?.content?.parts || [];
      const actualParts = candidateParts.filter(p => !p.thought);
      let t = actualParts.length > 0
        ? actualParts.map(p => p.text || '').join('')
        : (candidateParts.map(p => p.text || '').join(''));
      
      const finishReason = j?.candidates?.[0]?.finishReason;
      const blockReason = j?.promptFeedback?.blockReason;
      const isSafetyBlocked = finishReason === 'SAFETY' || blockReason === 'SAFETY';

      // If model returned a blank, near-empty response, or safety blocked on a large chunk, attempt solemn literature direct recovery
      if ((!t || t.trim().length < 15 || isLikelyHeadingOnlyTranslation(t, text.length) || isSafetyBlocked) && text.length > 100) {
        console.warn(`Gemini (${model}) returned minimal/safety response (${finishReason || blockReason || 'minimal'}). Retrying with solemn literary translation recovery prompt...`);
        const solemnPrompt = `You are an expert literary translator performing direct translation of authorized fiction literature into ${tgtLang || 'English'}.\n` +
          `Translate the exact text between these delimiters directly using solemn, objective, and dignified literary prose. Do not summarize, censor, continue, or invent content. Return only the pure translation.\n\n` +
          `=== RAW TEXT ===\n${text}\n=== END RAW TEXT ===`;
        const directPayload = {
          contents: [{ role: 'user', parts: [{ text: solemnPrompt }] }],
          system_instruction: {
            parts: [{
              text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the text directly with solemn, objective prose. Return only the translation.'
            }]
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
          },
          safetySettings
        };
        const recoveryRes = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(directPayload), signal });
        if (recoveryRes && recoveryRes.ok) {
          const recJson = await recoveryRes.json();
          const recParts = recJson?.candidates?.[0]?.content?.parts || [];
          const recActual = recParts.filter(p => !p.thought);
          const recText = recActual.length > 0 ? recActual.map(p => p.text || '').join('') : recParts.map(p => p.text || '').join('');
          if (recText && recText.trim().length > 0) {
            t = recText;
          }
        }
      }

      if (!t || t.trim().length === 0) throw new Error(`Empty response from ${model}. Google Cloud servers may be experiencing temporary high demand (503). Retrying...`);
      
      const updatedFinishReason = j?.candidates?.[0]?.finishReason;
      if ((updatedFinishReason === 'SAFETY' || updatedFinishReason === 'MAX_TOKENS') && t.trim().length > 0) {
        console.warn(`Gemini translation cut off due to ${updatedFinishReason}. Auto-continuing seamlessly...`);
        if (updatedFinishReason === 'SAFETY') {
          console.warn('Gemini translation cut off due to SAFETY filter. Attempting solemn auto-continuation...');
        }
        const tailSummary = t.trim().slice(-200);
        const contPrompt = `You are translating an authorized Chinese dark fantasy literature chapter into ${tgtLang || 'English'}.\n` +
          `The translation was partially completed up to this line:\n"...${tailSummary}"\n\n` +
          `FULL RAW TEXT TO FINISH TRANSLATING:\n${text}\n\n` +
          `INSTRUCTION: Continue translating the remaining text seamlessly from the exact cutoff point to the end. For all sacrificial rituals, combat, and beast attacks, use solemn, dignified, and objective literary prose. Translate 100% of the remaining scenes directly without repeating earlier text or omitting anything.`;
        try {
          const contPayload = {
            contents: [{ role: 'user', parts: [{ text: contPrompt }] }],
            system_instruction: {
              parts: [{
                text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the remaining chapter directly with solemn, objective prose.'
              }]
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
            },
            safetySettings
          };
          const contR = await fetchRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contPayload), signal });
          if (contR && contR.ok) {
            const cj = await contR.json();
            const cParts = cj?.candidates?.[0]?.content?.parts || [];
            const cActual = cParts.filter(p => !p.thought);
            const ct = cActual.length > 0 ? cActual.map(p => p.text || '').join('') : cParts.map(p => p.text || '').join('');
            if (ct) t += '\n\n' + ct;
          }
        } catch (ce) {
          console.warn('Continuation call error:', ce);
        }
      }
      
      const usage = j?.usageMetadata || null;
      const promptTokens = usage?.promptTokenCount || estimateTokens(prompt);
      const outputTokens = usage?.candidatesTokenCount || estimateTokens(t);
      const totalTokens = usage?.totalTokenCount || (promptTokens + outputTokens);
      const breakdown = calculateTokenBreakdown(promptTokens, components);
      return parseTranslationOutput(t, context, { promptTokens, outputTokens, totalTokens, breakdown });
    };

    const streamGemini = async (text, { apiKey, model, srcLang, tgtLang, glossary, instructions, signal, onChunk, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, strictModel = true, genderLocks = null, rotateApiKey = null }) => {
      if (!apiKey) throw new Error('Gemini API key required.');
      const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
      ];
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: {
          parts: [{
            text: 'Translate only the exact text supplied between the RAW TEXT delimiters. Do not continue, adapt, rewrite, summarize, or invent content. Reference material is not source text. Return only the translation.'
          }]
        },
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
        safetySettings
      };
      // Thinking Control: Only pass thinkingConfig when thinking is ON, or for thinking-native models (like 3.7 / 2.5).
      // Standard models (like gemini-3.5-flash-lite) reject thinkingBudget: 0 with 400 Invalid argument.
      const isThinkingModel = /gemini-(?:3\.7|2\.5)/i.test(model);
      if (enableThinking) {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 2048 };
      } else if (isThinkingModel) {
        payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
      const reqHeaders = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
      let r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });

      // Automatic key rotation on HTTP 429 quota exhaustion in stream
      if (!r.ok && r.status === 429) {
        const rotFn = rotateApiKey || (typeof window !== 'undefined' ? window.rotateApiKey : null);
        if (typeof rotFn === 'function') {
          const nextKey = rotFn(apiKey);
          if (nextKey && nextKey !== apiKey) {
            console.warn(`Gemini stream 429 quota/rate limit hit. Auto-rotated key to ${maskKey ? maskKey(nextKey) : 'nextKey'}. Retrying stream...`);
            return streamGemini(text, {
              apiKey: nextKey, model, srcLang, tgtLang, glossary, instructions, onChunk, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks, rotateApiKey: rotFn
            });
          }
        }
      }

      if (!r.ok && r.status === 400 && payload.generationConfig?.thinkingConfig) {
        delete payload.generationConfig.thinkingConfig;
        r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      }
      if (!r.ok && r.status === 400 && payload.system_instruction) {
        delete payload.system_instruction;
        r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
      }
      // If stream server is overloaded (503/500), retry with the SAME chosen model first
      if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
        console.warn(`Stream for ${model} returned ${r.status}. Waiting 2s before retrying ${model}...`);
        await new Promise(res => setTimeout(res, 2000));
        r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });

        if (!r.ok && (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504)) {
          console.warn(`Stream for ${model} still busy. Second attempt after 2.5s...`);
          await new Promise(res => setTimeout(res, 2500));
          r = await fetchRetry(url, { method: 'POST', headers: reqHeaders, body: JSON.stringify(payload), signal });
        }
      }

      // ONLY switch to fallback if strictModel is disabled AND (model is 404 or sustained 503)
      if (!strictModel && !r.ok && (r.status === 404 || r.status === 503) && model !== 'gemini-3.5-flash-lite') {
        const fallbackModel = 'gemini-3.5-flash-lite';
        const reason = r.status === 404 ? 'Model Not Found / Deprecated' : 'Sustained Server Overload (503)';
        console.warn(`Stream for ${model} unavailable (${r.status}) after retries. Falling back to ${fallbackModel}...`);
        if (typeof window !== 'undefined' && window.notifyModelChange) {
          window.notifyModelChange(model, fallbackModel, reason);
        }
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
        r = await fetchRetry(fallbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal });
      }
      if (!r || !r.ok) { const b = await r?.text().catch(() => '') || ''; throw new Error(`Gemini stream error ${r?.status || 'network'}: ${b.substring(0, 200)}`); }
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      let isContextContext = false;
      let finalContext = '';
      let slidingWindow = '';
      let accumulatedOutput = '';
      const deferThinkingOutput = Boolean(enableThinking);
      const deferredOutput = [];
      const emitVisible = (value) => {
        if (!value) return;
        if (deferThinkingOutput) {
          deferredOutput.push(value);
        } else {
          onChunk(value);
          accumulatedOutput += value;
        }
      };
      let lastUsage = null;
      let finishReason = null;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim();
            if (d === '[DONE]') {
              break;
            }
            try {
              const j = JSON.parse(d);
              if (j?.usageMetadata) lastUsage = j.usageMetadata;
              const fReason = j?.candidates?.[0]?.finishReason;
              if (fReason) finishReason = fReason;
              const candidateParts = j?.candidates?.[0]?.content?.parts || [];
              for (const part of candidateParts) {
                if (part.thought) continue; // Skip internal thinking tokens
                const t = part.text;
                if (t) {
                  if (context !== undefined) {
                    if (isContextContext) {
                      finalContext += t;
                    } else {
                      slidingWindow += t;
                      const splitMatch = slidingWindow.match(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
                      if (splitMatch) {
                        const idx = splitMatch.index;
                        const textPart = slidingWindow.substring(0, idx);
                        if (textPart) emitVisible(textPart);
                        finalContext += slidingWindow.substring(idx + splitMatch[0].length);
                        isContextContext = true;
                        slidingWindow = '';
                      } else {
                        if (slidingWindow.length > 40) {
                          const safeToEmit = slidingWindow.substring(0, slidingWindow.length - 40);
                          emitVisible(safeToEmit);
                          slidingWindow = slidingWindow.substring(slidingWindow.length - 40);
                        }
                      }
                    }
                  } else {
                    emitVisible(t);
                  }
                }
              }
            } catch (e) { }
          }
        }
      }
      if (slidingWindow && !isContextContext) { emitVisible(slidingWindow); slidingWindow = ''; }

      if (deferThinkingOutput) {
        const deferredText = deferredOutput.join('');
        if (deferredText.trim() && !isLikelyHeadingOnlyTranslation(deferredText, text.length)) {
          onChunk(deferredText);
          accumulatedOutput = deferredText;
        }
      }

      // Thinking responses can contain only internal thought parts in streaming mode.
      // Recover the visible translation without thinking instead of returning a blank chapter.
      if (enableThinking && (isLikelyHeadingOnlyTranslation(deferredOutput.join(''), text.length) || !accumulatedOutput.trim()) && text.trim().length > 100) {
        console.warn('Gemini thinking stream returned no visible translation. Retrying without thinking...');
        const recovery = await translateGemini(text, {
          apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking: false, strictModel, genderLocks
        });
        if (recovery?.text?.trim()) {
          onChunk(recovery.text);
          return recovery;
        }
      }

      // Auto-continuation on SAFETY or MAX_TOKENS cutoff during streaming
      if ((finishReason === 'SAFETY' || finishReason === 'MAX_TOKENS') && accumulatedOutput.trim().length > 0) {
        console.warn(`Gemini stream interrupted by ${finishReason}. Auto-resuming remaining content seamlessly...`);
        const tailSummary = accumulatedOutput.trim().slice(-200);
        const contPrompt = `You are translating an authorized Chinese dark fantasy literature chapter into ${tgtLang || 'English'}.\n` +
          `The translation was partially completed up to this line:\n"...${tailSummary}"\n\n` +
          `FULL RAW TEXT TO FINISH TRANSLATING:\n${text}\n\n` +
          `INSTRUCTION: Continue translating the remaining text seamlessly from the exact cutoff point to the end. For all sacrificial rituals, combat, and beast attacks, use solemn, dignified, and objective literary prose. Translate 100% of the remaining scenes directly without repeating earlier text or omitting anything.`;
        try {
          const contPayload = {
            contents: [{ role: 'user', parts: [{ text: contPrompt }] }],
            system_instruction: {
              parts: [{
                text: 'You are an expert literary translator performing direct translation of authorized dark fantasy fiction. Translate the remaining chapter directly with solemn, objective prose.'
              }]
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: enableThinking ? 2048 : 0 }
            },
            safetySettings
          };
          const contUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
          const contR = await fetchRetry(contUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contPayload), signal });
          if (contR && contR.ok) {
            const contReader = contR.body.getReader();
            let contBuf = '';
            while (true) {
              const { done: cDone, value: cVal } = await contReader.read();
              if (cDone) break;
              contBuf += dec.decode(cVal, { stream: true });
              const cLines = contBuf.split('\n'); contBuf = cLines.pop() || '';
              for (const cl of cLines) {
                if (cl.startsWith('data: ')) {
                  const cd = cl.slice(6).trim();
                  if (cd === '[DONE]') break;
                  try {
                    const cj = JSON.parse(cd);
                    if (cj?.usageMetadata) lastUsage = cj.usageMetadata;
                    const cParts = cj?.candidates?.[0]?.content?.parts || [];
                    for (const cp of cParts) {
                      if (cp.thought) continue;
                      if (cp.text) {
                        onChunk(cp.text);
                        accumulatedOutput += cp.text;
                      }
                    }
                  } catch (ce) {}
                }
              }
            }
          }
        } catch (contErr) {
          console.warn('Continuation stream error:', contErr);
        }
      }

      if ((!accumulatedOutput || !accumulatedOutput.trim()) && text.trim().length > 50) {
        console.warn(`Empty stream from ${model}. Attempting fallback to direct non-streaming translation...`);
        try {
          const directRec = await translateGemini(text, {
            apiKey, model, srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary, enableThinking, needContextUpdate, strictModel, genderLocks
          });
          if (directRec?.text?.trim()) {
            onChunk(directRec.text);
            return directRec;
          }
        } catch (recErr) {}
        throw new Error(`Empty stream from ${model}. Google Cloud servers may be experiencing temporary high demand (503). Retrying...`);
      }

      const pTok = lastUsage?.promptTokenCount || estimateTokens(prompt);
      const oTok = lastUsage?.candidatesTokenCount || estimateTokens(accumulatedOutput);
      const tTok = lastUsage?.totalTokenCount || (pTok + oTok);
      const breakdown = calculateTokenBreakdown(pTok, components);
      return { text: accumulatedOutput, newContext: finalContext.trim() || context || '', usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: tTok, breakdown } };
    };

    const translateDeepSeek = async (text, { apiKey, deepseekApiKey, model = 'deepseek-chat', srcLang, tgtLang, glossary, instructions, signal, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, genderLocks = null }) => {
      const key = deepseekApiKey || apiKey;
      if (!key) throw new Error('DeepSeek API key required.');
      const chosenModel = enableThinking && model === 'deepseek-chat' ? 'deepseek-reasoner' : (model || 'deepseek-chat');
      const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
      const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: chosenModel,
          messages: [
            { role: 'system', content: 'You are an expert direct literary translator. Translate only the supplied source text. Do not continue, adapt, rewrite, summarize, or invent content. Glossary terms and context are reference material only. Output only the translated text.' },
            { role: 'user', content: prompt }
          ],
          stream: false
        }),
        signal
      });
      if (!r || !r.ok) {
        const b = await r?.text().catch(() => '') || '';
        throw new Error(`DeepSeek API error ${r?.status || 'network'}: ${b.substring(0, 200)}`);
      }
      const j = await r.json();
      const raw = j.choices?.[0]?.message?.content || '';
      const usage = j?.usage || null;
      const promptTokens = usage?.prompt_tokens || estimateTokens(prompt);
      const outputTokens = usage?.completion_tokens || estimateTokens(raw);
      const totalTokens = usage?.total_tokens || (promptTokens + outputTokens);
      const breakdown = calculateTokenBreakdown(promptTokens, components);
      return parseTranslationOutput(raw, context, { promptTokens, outputTokens, totalTokens, breakdown });
    };

    const streamDeepSeek = async (text, { apiKey, deepseekApiKey, model = 'deepseek-chat', srcLang, tgtLang, glossary, instructions, signal, onChunk, context, smartGlossary = true, enableThinking = false, needContextUpdate = false, genderLocks = null }) => {
      const key = deepseekApiKey || apiKey;
      if (!key) throw new Error('DeepSeek API key required.');
      const chosenModel = enableThinking && model === 'deepseek-chat' ? 'deepseek-reasoner' : (model || 'deepseek-chat');
      const { prompt, components } = buildPromptResult(text, srcLang, tgtLang, glossary, instructions, context, smartGlossary, needContextUpdate, genderLocks);
      const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: chosenModel,
          messages: [
            { role: 'system', content: 'You are an expert direct literary translator. Translate only the supplied source text. Do not continue, adapt, rewrite, summarize, or invent content. Glossary terms and context are reference material only. Output only the translated text.' },
            { role: 'user', content: prompt }
          ],
          stream: true,
          stream_options: { include_usage: true }
        }),
        signal
      });
      if (!r || !r.ok) {
        const b = await r?.text().catch(() => '') || '';
        throw new Error(`DeepSeek stream error ${r?.status || 'network'}: ${b.substring(0, 200)}`);
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let isContextContext = false;
      let finalContext = '';
      let slidingWindow = '';
      let accumulatedOutput = '';
      let lastUsage = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const j = JSON.parse(dataStr);
              if (j?.usage) lastUsage = j.usage;
              const t = j.choices?.[0]?.delta?.content;
              if (t) {
                if (context !== undefined) {
                  if (isContextContext) {
                    finalContext += t;
                  } else {
                    slidingWindow += t;
                    const splitMatch = slidingWindow.match(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\n\r]*/i);
                    if (splitMatch) {
                      const idx = splitMatch.index;
                      const textPart = slidingWindow.substring(0, idx);
                      if (textPart) { onChunk(textPart); accumulatedOutput += textPart; }
                      finalContext += slidingWindow.substring(idx + splitMatch[0].length);
                      isContextContext = true;
                      slidingWindow = '';
                    } else {
                      if (slidingWindow.length > 40) {
                        const safeToEmit = slidingWindow.substring(0, slidingWindow.length - 40);
                        onChunk(safeToEmit);
                        accumulatedOutput += safeToEmit;
                        slidingWindow = slidingWindow.substring(slidingWindow.length - 40);
                      }
                    }
                  }
                } else {
                  onChunk(t);
                  accumulatedOutput += t;
                }
              }
            } catch (e) { }
          }
        }
      }
      if (slidingWindow && !isContextContext) { onChunk(slidingWindow); accumulatedOutput += slidingWindow; }
      const pTok = lastUsage?.prompt_tokens || estimateTokens(prompt);
      const oTok = lastUsage?.completion_tokens || estimateTokens(accumulatedOutput);
      const tTok = lastUsage?.total_tokens || (pTok + oTok);
      const breakdown = calculateTokenBreakdown(pTok, components);
      return { text: accumulatedOutput, newContext: finalContext.trim() || context || '', usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: tTok, breakdown } };
    };

    // Strips any leaked CONTEXT_UPDATE section (model echo with any dash variant)
    const stripContextLeak = (t) => (t || '').split(/[\n\r]*[-—–]{1,}CONTEXT_UPDATE[-—–]{1,}[\s\S]*$/i)[0].trim();

    const translateDeepL = async (text, { apiKey, srcLang, tgtLang, signal }) => {
      if (!apiKey) throw new Error('DeepL API key required.');
      const tgt = DEEPL_LANG_MAP[tgtLang]; if (!tgt) throw new Error(`DeepL doesn't support ${tgtLang}.`);
      const src = srcLang && srcLang !== 'Auto-detect' ? DEEPL_LANG_MAP[srcLang] : undefined;
      const params = new URLSearchParams({ text, target_lang: tgt });
      if (src) params.append('source_lang', src);
      const base = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
      const r = await fetchRetry(`${base}/v2/translate`, { method: 'POST', headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal });
      if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`DeepL error ${r.status}: ${b.substring(0, 200)}`); }
      const j = await r.json();
      const resText = j.translations?.[0]?.text || '';
      const pTok = estimateTokens(text);
      const oTok = estimateTokens(resText);
      return { text: resText, usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: pTok + oTok, breakdown: calculateTokenBreakdown(pTok, { estSource: pTok }) } };
    };

    const translateLibre = async (text, { srcLang, tgtLang, signal, libreUrl }) => {
      const tgt = LIBRE_LANG_MAP[tgtLang]; if (!tgt) throw new Error(`LibreTranslate doesn't support ${tgtLang}.`);
      const src = srcLang && srcLang !== 'Auto-detect' ? (LIBRE_LANG_MAP[srcLang] || 'auto') : 'auto';
      const url = libreUrl || 'https://libretranslate.com';
      const r = await fetchRetry(`${url}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text, source: src, target: tgt, format: 'text' }), signal });
      if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`LibreTranslate error ${r.status}: ${b.substring(0, 200)}`); }
      const j = await r.json();
      const resText = j.translatedText || '';
      const pTok = estimateTokens(text);
      const oTok = estimateTokens(resText);
      return { text: resText, usage: { promptTokens: pTok, outputTokens: oTok, totalTokens: pTok + oTok, breakdown: calculateTokenBreakdown(pTok, { estSource: pTok }) } };
    };

                // --- Multi-Key Profile Management ---
      // OpenAI Translation Routine
    const translateOpenAI = async (text, { apiKey, srcLang, tgtLang, customInstructions, terminology, signal, glossaryTerms, isContinuation, priorContext, chapterTitle, model }) => {
      const selectedModel = model || 'gpt-4o-mini';
      const prompt = buildContextPrompt({
        text,
        srcLang,
        tgtLang,
        customInstructions,
        terminology: glossaryTerms || terminology,
        isContinuation,
        priorContext,
        chapterTitle
      });

      const isReasoning = selectedModel.startsWith('o1') || selectedModel.startsWith('o3');
      const body = {
        model: selectedModel,
        messages: [
          { role: 'user', content: prompt }
        ]
      };
      if (!isReasoning) {
        body.temperature = 0.3;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const output = data.choices?.[0]?.message?.content || '';
      return parseTranslationOutput(output);
    };

    // Anthropic Claude Translation Routine
    const translateClaude = async (text, { apiKey, srcLang, tgtLang, customInstructions, terminology, signal, glossaryTerms, isContinuation, priorContext, chapterTitle, model }) => {
      const selectedModel = model || 'claude-3-5-haiku-20241022';
      const prompt = buildContextPrompt({
        text,
        srcLang,
        tgtLang,
        customInstructions,
        terminology: glossaryTerms || terminology,
        isContinuation,
        priorContext,
        chapterTitle
      });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 8192,
          temperature: 0.3,
          messages: [
            { role: 'user', content: prompt }
          ]
        }),
        signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Claude API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const output = data.content?.[0]?.text || '';
      return parseTranslationOutput(output);
    };

    

    // Global Multi-Key Lease Pool (Guarantees zero concurrent collision & smart failover to idle keys)
    
    // ══════════════════════════════════════════════════════════
    // SYSTEM DIAGNOSTICS & TELEMETRY LOGGER
    // ══════════════════════════════════════════════════════════
    const maskKey = window.maskKey;
    const KeyPool = window.KeyPool;

    const streamWithRotation = async (text, opts) => {
      let currentOpts = { ...opts };
      const allKeys = opts?.availableKeys || [];
      if (allKeys.length > 1) {
        const leased = await KeyPool.acquireKey(allKeys);
        if (leased) currentOpts.apiKey = leased;
      }
      const maxAttempts = 60;
      let backoffDelay = 2000;

      try {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const streamFn = currentOpts.provider === 'deepseek' ? streamDeepSeek : streamGemini;
            return await streamFn(text, currentOpts);
          } catch (err) {
            if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
            const errMsg = (err.message || '').toLowerCase();
            const isRetryable = errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('quota') ||
              errMsg.includes('resource_exhausted') || errMsg.includes('503') || errMsg.includes('500') ||
              errMsg.includes('502') || errMsg.includes('504') || errMsg.includes('demand') ||
              errMsg.includes('overloaded') || errMsg.includes('unavailable') || errMsg.includes('empty response') ||
              errMsg.includes('empty stream') || errMsg.includes('network') || errMsg.includes('failed to fetch');
            if (isRetryable) {
              if (allKeys.length > 1) {
                const freshKey = await KeyPool.acquireKey(allKeys, currentOpts.apiKey);
                if (freshKey && freshKey !== currentOpts.apiKey) {
                  const errBrief = (err.message || '').replace(/\s+/g, ' ').trim().slice(0, 75);
                  console.warn(`Retryable error (${errBrief}) → Leased fresh idle key ${freshKey.substring(0, 8)}... (attempt ${attempt + 1}/${maxAttempts})`);
                  currentOpts.apiKey = freshKey;
                  await new Promise(r => setTimeout(r, 600));
                  continue;
                }
              }
              const waitSec = Math.round(backoffDelay / 1000);
              console.warn(`[Strict/Rotation Engine] Stream ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 60)}). Waiting ${waitSec}s (attempt ${attempt + 1}/${maxAttempts})...`);
              window.AppLogger?.log('warn', 'RotationEngine', `Attempt ${attempt + 1}/${maxAttempts}: Stream ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 80)}). Waiting ${waitSec}s...`);
              await new Promise(r => setTimeout(r, backoffDelay));
              backoffDelay = Math.min(backoffDelay * 1.25, 6000);
              continue;
            }
            throw err;
          }
        }
        throw new Error(`Model ${currentOpts.model || 'chosen'} stream busy/rate-limited after ${maxAttempts} patient attempts. Progress safely saved.`);
      } finally {
        if (currentOpts.apiKey) KeyPool.releaseKey(currentOpts.apiKey);
      }
    };

    const translateWithRotation = async (text, opts) => {
      let currentOpts = { ...opts };
      const allKeys = opts?.availableKeys || [];
      if (allKeys.length > 1) {
        const leased = await KeyPool.acquireKey(allKeys);
        if (leased) currentOpts.apiKey = leased;
      }
      const maxAttempts = 60;
      let backoffDelay = 2000;

      // ── Translation Memory Exact Cache Lookup (§8.2) ──
      const isTmEnabled = (typeof window !== 'undefined' && typeof window.__translationMemoryEnabled !== 'undefined')
        ? window.__translationMemoryEnabled
        : (typeof localStorage !== 'undefined' ? localStorage.getItem('translationMemoryEnabled') !== 'false' : true);

      if (isTmEnabled && window.TMDiffEngine && text && typeof text === 'string' && text.trim().length >= 10) {
        try {
          const tmMatch = await window.TMDiffEngine.TM.lookupExact(text, currentOpts.srcLang, currentOpts.tgtLang);
          if (tmMatch && tmMatch.targetText) {
            const approxTokens = Math.round(text.length / 4);
            window.TMDiffEngine.TM.recordTokensSaved(approxTokens);
            console.log(`⚡ [TM Bank] Exact match hit! Saved ~${approxTokens} tokens.`);
            if (currentOpts.apiKey && allKeys.length > 1) KeyPool.releaseKey(currentOpts.apiKey);
            return (typeof opts.needContextUpdate !== 'undefined' || typeof opts.context !== 'undefined')
              ? { text: tmMatch.targetText, newContext: '', usage: { promptTokens: 0, outputTokens: 0, totalTokens: 0 } }
              : tmMatch.targetText;
          }
        } catch (tmErr) {
          console.warn('[TM Bank] Lookup error:', tmErr);
        }
      }

      try {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const res = await translateChunk(text, currentOpts);
            if (res) {
              // ── Store Translated Segment into TM Bank (§8.2) ──
              if (isTmEnabled && window.TMDiffEngine && text) {
                const resText = (res && typeof res === 'object') ? (res.text || '') : (typeof res === 'string' ? res : '');
                if (resText && !resText.startsWith('[Error:')) {
                  const novelKey = currentOpts?.novelId || (typeof activeNovelRecord !== 'undefined' && activeNovelRecord?.id) || '';
                  window.TMDiffEngine.TM.storeSegments(text, resText, {
                    sourceLang: currentOpts.srcLang,
                    targetLang: currentOpts.tgtLang,
                    novelId: novelKey
                  }).catch(e => console.warn('[TM Bank] Segment store warning:', e));
                }
              }
              return res;
            }
            throw new Error(`Empty response from ${currentOpts.model || 'provider'}`);
          } catch (err) {
            if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
            const errMsg = (err.message || '').toLowerCase();
            const isRetryable = errMsg.includes('429') || errMsg.includes('rate') || errMsg.includes('quota') ||
              errMsg.includes('resource_exhausted') || errMsg.includes('503') || errMsg.includes('500') ||
              errMsg.includes('502') || errMsg.includes('504') || errMsg.includes('demand') ||
              errMsg.includes('overloaded') || errMsg.includes('unavailable') || errMsg.includes('empty response') ||
              errMsg.includes('empty stream') || errMsg.includes('network') || errMsg.includes('failed to fetch') ||
              errMsg.includes('timed out') || errMsg.includes('timeout') || errMsg.includes('aborted');
            if (isRetryable) {
              if (allKeys.length > 1) {
                const freshKey = await KeyPool.acquireKey(allKeys, currentOpts.apiKey);
                if (freshKey && freshKey !== currentOpts.apiKey) {
                  const errBrief = (err.message || '').replace(/\s+/g, ' ').trim().slice(0, 75);
                  console.warn(`Retryable error (${errBrief}) → Leased fresh idle key ${freshKey.substring(0, 8)}... (attempt ${attempt + 1}/${maxAttempts})`);
                  currentOpts.apiKey = freshKey;
                  await new Promise(r => setTimeout(r, 600));
                  continue;
                }
              }
              const waitSec = Math.round(backoffDelay / 1000);
              console.warn(`[Strict/Rotation Engine] Model ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 60)}). Waiting ${waitSec}s (attempt ${attempt + 1}/${maxAttempts})...`);
              window.AppLogger?.log('warn', 'RotationEngine', `Attempt ${attempt + 1}/${maxAttempts}: ${currentOpts.model || 'model'} busy (${errMsg.slice(0, 80)}). Waiting ${waitSec}s...`);
              await new Promise(r => setTimeout(r, backoffDelay));
              backoffDelay = Math.min(backoffDelay * 1.25, 6000);
              continue;
            }
            throw err;
          }
        }
        throw new Error(`Model ${currentOpts.model || 'chosen'} busy/rate-limited after ${maxAttempts} patient attempts. Progress safely saved.`);
      } finally {
        if (currentOpts.apiKey) KeyPool.releaseKey(currentOpts.apiKey);
      }
    };

    const translateChunk = async (text, opts) => {
      switch (opts.provider) {
        case 'deepseek': return translateDeepSeek(text, opts);
        case 'deepl': return translateDeepL(text, opts);
        case 'libre': return translateLibre(text, opts);
        default: return translateGemini(text, { ...opts, context: opts.context });
      }
    };

    

    // ═══════════════════════════════════════════════════════════════
    // AI TABLE OF CONTENTS & METADATA POLISHER ENGINE
    // ═══════════════════════════════════════════════════════════════
                                window.aiPolishEpubToc = async function(sampleChapters, bookTitle, onRetryStatus, customProvider, customInstruction) {
      const provider = customProvider || localStorage.getItem('translationProvider') || 'gemini';
      
      let allKeys = [];
      try {
        const stored = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
        allKeys = (stored[provider] || []).map(p => p.key).filter(Boolean);
      } catch (e) {}

      if (allKeys.length === 0) {
        const single = localStorage.getItem(`${provider}ApiKey`) || (provider === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
        if (single) allKeys.push(single);
      }

      if (allKeys.length === 0) throw new Error(`${provider.toUpperCase()} API key required. Please configure your key in Settings .`);

      let keyIndex = 0;
      const getActiveKey = () => allKeys[keyIndex % allKeys.length];
      const rotateKey = () => { keyIndex++; return getActiveKey(); };

      const compactLines = sampleChapters.map(c => {
        let line = `${c.index}. ${c.rawName || ''}`;
        if (c.internalTitle) line += ` -> "${c.internalTitle}"`;
        return line;
      }).join('\n');

      const customUserRule = customInstruction ? `\nUSER CUSTOM INSTRUCTIONS:\n${customInstruction}\n` : '';

      const prompt = `You are an expert digital eBook editor and Table of Contents specialist.
Task: Standardize raw/scraped Table of Contents entries into clean, readable, professional titles by analyzing both file names AND the internal chapter text snippet provided.

CRITICAL RULES:
1. PRESERVE NOVEL HIERARCHY & SPECIAL SECTIONS:
   - If an entry is a Volume, Arc, Year, or Book (e.g. "Year 3, Volume 3", "Volume 1", "Book 2: Earth", "Arc 4"), PRESERVE the Volume/Arc name.
   - If an entry is a Prologue, Epilogue, Interlude, Monologue, Side Story (SS), Afterword, Synopsis, or Illustrations, KEEP its authentic character name (e.g. "Prologue: Shiina Hiyori's Monologue", "Illustrations", "Epilogue", "Side Story - Kushida", "1.1", "7.1", "E.1").
   - If an entry has Parts or Sub-chapters (e.g. "Part 1", "Part 2", "Chapter 1 - Part 1"), preserve the Part structure.
   - DO NOT flatten or renumber everything into a generic "Chapter 1 to 500" if the book is an anthology or light novel series with Volumes/Years/Arcs!
2. CLEAN STORY CHAPTERS:
   - Use the internal text snippet and heading to produce the true chapter title (e.g. "Chapter 1 - The Structure of Japanese Society").
   - Strip ugly web scrape artifacts and file paths (.xhtml, .html).${customUserRule}

Book Title: ${bookTitle || 'Unknown'}

Chapters to clean:
${compactLines}

Return strictly a JSON object with this exact format:
{
  "cleanedTitle": "Official Book Title",
  "chapters": [
    { "index": 1, "cleanedName": "Cleaned Title" }
  ]
}`;

      const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
      ];

      // Strictly verified official Gemini 3 Flash endpoints (high speed & high quota)
      const isCustomActive = localStorage.getItem('useCustomModel') === 'true';
      const storedCustomModel = (localStorage.getItem('customModel') || '').trim();
      const preferredModel = (isCustomActive && storedCustomModel) ? storedCustomModel : (localStorage.getItem('geminiModel') || 'gemini-3.8-flash');
      const geminiModels = Array.from(new Set([
        preferredModel,
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3-flash-preview'
      ])).filter(m => (m.startsWith('gemini') || m === preferredModel) && !m.includes('pro'));

      let modelIdx = 0;
      const maxAttempts = 30; // High resilience
      let backoffDelay = 2000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const currentKey = getActiveKey();
        try {
          let rawJson = '';
          let data = null;

          if (provider === 'gemini' || !provider) {
            const currentModel = geminiModels[modelIdx % geminiModels.length];
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${currentKey}`;
            
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), 14000);

            let res;
            try {
              res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: ctrl.signal,
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  safetySettings,
                  generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                    // thinking disabled
                  }
                })
              });
            } finally {
              clearTimeout(timeoutId);
            }

            if (!res.ok) {
              const errTxt = await res.text().catch(() => '');
              const is404 = res.status === 404 || errTxt.includes('no longer available') || errTxt.includes('not found') || errTxt.includes('is not supported');
              const is503 = res.status === 503 || res.status === 500 || res.status === 502 || res.status === 504 || errTxt.includes('high demand') || errTxt.includes('UNAVAILABLE') || errTxt.includes('overloaded');
              const is429 = res.status === 429 || errTxt.includes('quota') || errTxt.includes('RESOURCE_EXHAUSTED') || errTxt.includes('rate limit');

              const isStrict = localStorage.getItem('strictModel') !== 'false';
              if ((is404 || is503) && !isStrict) {
                modelIdx++;
                const nextModel = geminiModels[modelIdx % geminiModels.length];
                const reason = is503 ? 'High Server Demand (503)' : 'Model Unavailable (404)';
                if (typeof window !== 'undefined' && window.notifyModelChange) {
                  window.notifyModelChange(currentModel, nextModel, reason);
                }
                if (typeof onRetryStatus === 'function') onRetryStatus(`⚠️ Model switched: ${currentModel} → ${nextModel} (${reason})`);
                await new Promise(r => setTimeout(r, 800));
                continue;
              }

              if (is429) {
                rotateKey();
                const keyNum = (keyIndex % allKeys.length) + 1;
                const waitSec = Math.round(backoffDelay / 1000);
                for (let s = waitSec; s > 0; s--) {
                  if (typeof onRetryStatus === 'function') {
                    onRetryStatus(`Rate limit cooldown: retrying in ${s}s with Key ${keyNum}/${allKeys.length} (${currentModel})...`);
                  }
                  await new Promise(r => setTimeout(r, 1000));
                }
                backoffDelay = Math.min(backoffDelay * 1.3, 8000);
                continue;
              }
              throw new Error(`Gemini Error ${res.status}: ${errTxt.substring(0, 150)}`);
            }
            data = await res.json();
            
            // Correctly filter out thought reasoning tokens from Gemini 3
            const candidateParts = data?.candidates?.[0]?.content?.parts || [];
            const actualParts = candidateParts.filter(p => !p.thought);
            rawJson = actualParts.length > 0
              ? actualParts.map(p => p.text || '').join('')
              : (candidateParts.map(p => p.text || '').join(''));
          } else if (provider === 'deepseek') {
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), 15000);
            let res;
            try {
              res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
                signal: ctrl.signal,
                body: JSON.stringify({
                  model: 'deepseek-chat',
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' }
                })
              });
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              const errTxt = await res.text().catch(() => '');
              if (res.status === 429 || res.status === 503) {
                await new Promise(r => setTimeout(r, backoffDelay));
                backoffDelay = Math.min(backoffDelay * 1.4, 8000);
                continue;
              }
              throw new Error(`DeepSeek Error ${res.status}: ${errTxt.substring(0, 150)}`);
            }
            data = await res.json();
            rawJson = data.choices?.[0]?.message?.content || '';
          } else if (provider === 'openai') {
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), 15000);
            let res;
            try {
              res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
                signal: ctrl.signal,
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: prompt }],
                  response_format: { type: 'json_object' }
                })
              });
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              const errTxt = await res.text().catch(() => '');
              if (res.status === 429 || res.status === 503) {
                await new Promise(r => setTimeout(r, backoffDelay));
                backoffDelay = Math.min(backoffDelay * 1.4, 8000);
                continue;
              }
              throw new Error(`OpenAI Error ${res.status}: ${errTxt.substring(0, 150)}`);
            }
            data = await res.json();
            rawJson = data.choices?.[0]?.message?.content || '';
          } else if (provider === 'claude') {
            const ctrl = new AbortController();
            const timeoutId = setTimeout(() => ctrl.abort(), 15000);
            let res;
            try {
              res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': currentKey, 'anthropic-version': '2023-06-01', 'dangerously-allow-browser': 'true' },
                signal: ctrl.signal,
                body: JSON.stringify({
                  model: 'claude-3-5-haiku-20241022',
                  max_tokens: 4096,
                  messages: [{ role: 'user', content: prompt }]
                })
              });
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              const errTxt = await res.text().catch(() => '');
              if (res.status === 429 || res.status === 503) {
                await new Promise(r => setTimeout(r, backoffDelay));
                backoffDelay = Math.min(backoffDelay * 1.4, 8000);
                continue;
              }
              throw new Error(`Claude Error ${res.status}: ${errTxt.substring(0, 150)}`);
            }
            data = await res.json();
            rawJson = data.content?.[0]?.text || '';
          }

          let clean = rawJson.replace(/^\`\`\`json\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
          
          // Fallback regex to extract JSON object if wrapped in text
          if (!clean.startsWith('{')) {
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) clean = match[0];
          }

          const parsed = JSON.parse(clean);
          
          let pTok = Math.ceil(prompt.length / 4);
          let oTok = Math.ceil(rawJson.length / 4);
          if (data?.usageMetadata) {
            pTok = data.usageMetadata.promptTokenCount || pTok;
            oTok = data.usageMetadata.candidatesTokenCount || oTok;
          } else if (data?.usage) {
            pTok = data.usage.prompt_tokens || data.usage.input_tokens || pTok;
            oTok = data.usage.completion_tokens || data.usage.output_tokens || oTok;
          }

          const activeModelName = provider === 'gemini' || !provider ? geminiModels[modelIdx % geminiModels.length] : (provider === 'deepseek' ? 'deepseek-chat' : (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku'));

          return {
            ...parsed,
            usage: {
              promptTokens: pTok,
              outputTokens: oTok,
              totalTokens: pTok + oTok,
              model: activeModelName,
              provider
            }
          };
        } catch (err) {
          const isTimeout = err.name === 'AbortError';
          const isTransient = isTimeout || (err.message || '').includes('429') || (err.message || '').includes('503') || (err.message || '').includes('quota') || (err.message || '').includes('demand') || (err.message || '').includes('404');
          if (isTransient && attempt < maxAttempts - 1) {
            modelIdx++;
            rotateKey();
            if (typeof onRetryStatus === 'function') {
              onRetryStatus(isTimeout ? 'Request timed out (14s). Switched to next key/model...' : `Transient error (${err.message.substring(0, 40)}). Retrying...`);
            }
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          if (attempt === maxAttempts - 1) throw err;
        }
      }
    };

const formatModelName = (id, displayName) => {
      if (displayName && displayName !== id && !displayName.startsWith('models/')) return displayName;
      if (id.startsWith('gemini-')) {
        return id
          .split('-')
          .map((part, idx) => {
            if (idx === 0) return 'Gemini';
            if (/^\d+(\.\d+)?$/.test(part)) return part;
            if (part.toLowerCase() === '8b') return '8B';
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join(' ');
      }
      if (id.startsWith('gemma-')) {
        return id
          .split('-')
          .map((part, idx) => {
            if (idx === 0) return 'Gemma';
            return part.toUpperCase();
          })
          .join(' ');
      }
      return id.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    };

    const groupModelsByCompany = (models) => {
      const groups = {
        ' RECOMMENDED FREE TIER': [],
        ' FLAGSHIP & DEEP REASONING': [],
        ' ULTRA FAST & LITE': [],
        ' OTHER & OPEN WEIGHTS': []
      };

      for (const m of models) {
        const id = (m.id || '').toLowerCase();
        const name = (m.name || '').toLowerCase();

        if (id === 'gemini-3.5-flash-lite' || id === 'gemini-3.1-flash-lite' || name.includes('recommended free tier') || name.includes('fast & stable') || name.includes('highest free quota')) {
          groups[' RECOMMENDED FREE TIER'].push(m);
        } else if (id.includes('pro') || id.startsWith('gemini-3.7') || (id.startsWith('gemini-3.5-flash') && !id.includes('lite')) || name.includes('flagship') || name.includes('literary')) {
          groups[' FLAGSHIP & DEEP REASONING'].push(m);
        } else if (id.includes('lite') || id.includes('8b') || id.includes('nano') || name.includes('lite') || name.includes('lowest cost') || name.includes('high speed')) {
          groups[' ULTRA FAST & LITE'].push(m);
        } else {
          groups[' OTHER & OPEN WEIGHTS'].push(m);
        }
      }

      return Object.entries(groups).filter(([_, list]) => list.length > 0);
    };

    const fetchGeminiModels = async (apiKey) => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`);
      if (!r.ok) throw new Error('Failed to fetch models');
      const j = await r.json();
      const valid = (j.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent') &&
          !m.name.includes('embedding') &&
          !m.name.includes('aqa') &&
          !m.name.includes('imagen') &&
          !m.name.includes('tts') &&
          !m.name.includes('audio') &&
          !m.name.includes('bison') &&
          !m.name.includes('gecko') &&
          !m.name.includes('gemini-2') &&
          !m.name.includes('gemini-1'))
        .map(m => {
          const id = m.name.replace('models/', '');
          return { id, name: formatModelName(id, m.displayName) };
        });

            // Sort models logically: Gemini 3 Flash -> Lite -> Pro
            valid.sort((a, b) => {
        const getRank = id => {
          if (id.startsWith('gemini-3.7-flash')) return -40;
          if (id.startsWith('gemini-3.6-flash')) return -39;
          if (id.startsWith('gemini-3.5-flash-lite')) return -38;
          if (id.startsWith('gemini-3.1-flash-lite')) return -37;
          if (id.startsWith('gemini-3.5-flash')) return -36;
          if (id.startsWith('gemini-3.1-pro-preview')) return -35;
          if (id.startsWith('gemini-3-flash-preview')) return -34;
          return 0;
        };
        return getRank(a.id) - getRank(b.id);
      });
      return valid;
    };

    // ═══════════════════════════════════════
    // INFO TOOLTIP (Responsive & Touch-Friendly)
    // ═══════════════════════════════════════
    const InfoTooltip = ({ title, text, tip }) => {
      const [show, setShow] = useState(false);
      const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
      const [placement, setPlacement] = useState('top');
      const btnRef = useRef(null);

      useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
      }, []);

      const checkPlacement = () => {
        if (btnRef.current) {
          const rect = btnRef.current.getBoundingClientRect();
          if (rect.top < 240) {
            setPlacement('bottom');
          } else {
            setPlacement('top');
          }
        }
      };

      const handleOpen = () => {
        checkPlacement();
        setShow(true);
      };

      const isBottom = placement === 'bottom';

      return h('span', { className: 'relative inline-flex items-center ml-1' },
        h('button', {
          ref: btnRef,
          type: 'button',
          onClick: (e) => { e.preventDefault(); e.stopPropagation(); checkPlacement(); setShow(p => !p); },
          onMouseEnter: () => { if (!isMobile) handleOpen(); },
          onMouseLeave: () => { if (!isMobile) setShow(false); },
          className: 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-w-[24px] min-h-[24px]',
          'aria-label': `${title} information`
        }, ic(Info, 14)),

        // Mobile Centered Modal Popover with Backdrop
        show && isMobile && h('div', {
          className: 'fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in',
          onClick: (e) => { e.stopPropagation(); setShow(false); }
        },
          h('div', {
            className: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm max-h-[85vh] overflow-y-auto space-y-3 relative',
            onClick: (e) => e.stopPropagation()
          },
            h('div', { className: 'flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5' },
              h('div', { className: 'font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm' },
                ic(Info, 16),
                title
              ),
              h('button', {
                type: 'button',
                onClick: () => setShow(false),
                className: 'p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer',
                'aria-label': 'Close info'
              }, ic(X, 16))
            ),
            h('p', { className: 'text-slate-600 dark:text-slate-300 text-xs leading-relaxed' }, text),
            tip && h('div', { className: 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 p-2.5 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300' },
              h('strong', { className: 'font-semibold text-indigo-900 dark:text-indigo-200' }, 'Tip: '), tip
            ),
            h('button', {
              type: 'button',
              onClick: () => setShow(false),
              className: 'w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer'
            }, 'Got it')
          )
        ),

        // Desktop Sleek Popover
        show && !isMobile && h('div', {
          className: `absolute ${isBottom ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-32px)] p-3.5 bg-slate-900 dark:bg-slate-900 text-white text-xs rounded-xl shadow-2xl border border-slate-700 z-50 transition-all pointer-events-none`
        },
          h('div', { className: 'font-bold text-indigo-300 mb-1 flex items-center gap-1.5' },
            ic(Info, 13),
            title
          ),
          h('p', { className: 'text-slate-200 leading-relaxed mb-1.5' }, text),
          tip && h('p', { className: 'text-slate-400 border-t border-slate-700 pt-1.5 text-[11px]' },
            h('strong', { className: 'text-indigo-300' }, 'Tip: '), tip
          )
        )
      );
    };

    // ═══════════════════════════════════════
    // GLOBAL EXPORT & FILE UTILITIES (Accessible by All Components)
    // ══════════════════════════════════════════════════════════════════════
    // (escapeXml is global)

    // saveUniversalBlob is globally provided by utils.js

    const updateOriginalEpubNavigation = window.updateOriginalEpubNavigation;
    const generateEpubFromChapters = window.generateEpubFromChapters;

    // ══════════════════════════════════════════════════════════════════════
    // MOON+ READER PRO ENGINE (Virtual Windowed Preloading, Visible Crisp UI)
    // ══════════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════════
    window.GeminiNovelDB = window.GeminiNovelDB || {
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

    // ══════════════════════════════════════════════════════════════════════
    // PRO MOON+ READER ENGINE (Virtual Windowing, High-Res Art & Pro TTS Player)
    // ══════════════════════════════════════════════════════════════════════
    const MoonReaderModal = window.MoonReaderModal;

    // ERROR BOUNDARY
    // ═══════════════════════════════════════
    class ErrorBoundary extends React.Component {
      constructor(p) { super(p); this.state = { hasError: false, error: null } }
      static getDerivedStateFromError(e) { return { hasError: true, error: e } }
      render() { if (this.state.hasError) return h('div', { className: 'min-h-screen flex items-center justify-center bg-red-50 dark:bg-gray-900 p-8' }, h('div', { className: 'max-w-lg text-center' }, h('h1', { className: 'text-2xl font-bold text-red-600 mb-4' }, 'Something went wrong'), h('p', { className: 'text-gray-700 dark:text-gray-300 mb-4' }, this.state.error?.message), h('button', { onClick: () => this.setState({ hasError: false, error: null }), className: 'px-6 py-2 bg-indigo-600 text-white rounded-lg' }, 'Try Again'))); return this.props.children }
    }

    // ═══════════════════════════════════════
    // MAIN APP
    // ═══════════════════════════════════════
    function App() {
      // --- Core State ---
      const [inputText, setInputText] = useState('');
      const [assembledText, setAssembledText] = useState('');
      const [terminology, setTerminology] = useState(() => localStorage.getItem('terminology') || '');
      const [enableGlossary, setEnableGlossary] = useState(() => localStorage.getItem('enableGlossary') === 'true');
      const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem('customInstructions') || '');
      const [smartGlossary, setSmartGlossary] = useState(() => localStorage.getItem('smartGlossary') !== 'false');
      const [genderLocks, setGenderLocks] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_gender_locks');
          return s ? JSON.parse(s) : {};
        } catch(e) { return {}; }
      });




      // --- Novel Health & QA Proofreader State (§5.9 + §7.1 + §7.5) ---
      const [healthAuditEnabled, setHealthAuditEnabled] = useState(() => localStorage.getItem('healthAuditEnabled') !== 'false');
      const [qaProofreaderEnabled, setQaProofreaderEnabled] = useState(() => localStorage.getItem('qaProofreaderEnabled') !== 'false');
      const [cjkLeakCheckEnabled, setCjkLeakCheckEnabled] = useState(() => localStorage.getItem('cjkLeakCheckEnabled') !== 'false');
      const [antiMtlGateEnabled, setAntiMtlGateEnabled] = useState(() => localStorage.getItem('antiMtlGateEnabled') !== 'false');

      const [qaModalOpen, setQaModalOpen] = useState(false);
      const [qaAuditResult, setQaAuditResult] = useState(null);
      const [qaAuditNovelRef, setQaAuditNovelRef] = useState(null);
      const [qaFilterCategory, setQaFilterCategory] = useState('all');
      const [qaCheckGaps, setQaCheckGaps] = useState(true);
      const [qaCheckCorrupt, setQaCheckCorrupt] = useState(true);
      const [qaCheckCjk, setQaCheckCjk] = useState(() => localStorage.getItem('cjkLeakCheckEnabled') !== 'false');
      const [qaCheckAntiMtl, setQaCheckAntiMtl] = useState(() => localStorage.getItem('antiMtlGateEnabled') !== 'false');
      const [qaCheckLoops, setQaCheckLoops] = useState(true);
      const [qaCheckDuplicates, setQaCheckDuplicates] = useState(true);

      // --- Translation Memory & Snapshots State (§8.2 + §8.6) ---
      const [translationMemoryEnabled, setTranslationMemoryEnabled] = useState(() => localStorage.getItem('translationMemoryEnabled') !== 'false');
      const [snapshotsEnabled, setSnapshotsEnabled] = useState(() => localStorage.getItem('snapshotsEnabled') !== 'false');
      const [diffModalOpen, setDiffModalOpen] = useState(false);
      const [activeDiffData, setActiveDiffData] = useState(null);
      const [diffSnapshotsList, setDiffSnapshotsList] = useState([]);
      const [selectedDiffSnapId, setSelectedDiffSnapId] = useState('');
      const [tmStats, setTmStats] = useState({ totalUnits: 0, tokensSaved: 0, exactHits: 0, fuzzyHits: 0 });

      const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'text');
      const [settingsCategory, setSettingsCategory] = useState(() => localStorage.getItem('gemini_settings_category') || 'engine');
      const [isFetchingUrl, setIsFetchingUrl] = useState(false);
      const [isFetchingPaused, setIsFetchingPaused] = useState(false);
      const [webImportStatus, setWebImportStatus] = useState('');
      const [webImportError, setWebImportError] = useState(null);
      const [activeCrawlSession, setActiveCrawlSession] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      });
      const [webImportData, setWebImportData] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          return s ? JSON.parse(s) : null;
        } catch (e) { return null; }
      });
      const [webImportUrl, setWebImportUrl] = useState(() => {
        try {
          const s = localStorage.getItem('gemini_active_crawl_session');
          if (s) {
            const parsed = JSON.parse(s);
            return parsed.url || parsed.sourceUrl || '';
          }
          return '';
        } catch (e) { return ''; }
      });

      const activeNovelView = useMemo(() => {
        return webImportData || activeCrawlSession || null;
      }, [webImportData, activeCrawlSession]);

      // --- Web Novel Search State ---
      const [novelSearchResults, setNovelSearchResults] = useState([]);
      const [isSearchingNovels, setIsSearchingNovels] = useState(false);
      const [novelSearchFilter, setNovelSearchFilter] = useState('all');
      const [isSearchResultsCollapsed, setIsSearchResultsCollapsed] = useState(false);

      // --- SwiftAudio Engine & Player State ---
      const [swiftAudioResults, setSwiftAudioResults] = useState([]);
      const [isSwiftAudioSearching, setIsSwiftAudioSearching] = useState(false);
      const [isSwiftAudioMode, setIsSwiftAudioMode] = useState(false);
      const [activeAudiobook, setActiveAudiobook] = useState(null);
      const [audioPlayerState, setAudioPlayerState] = useState(() => window.SwiftAudioEngine?.Player?.getState() || { isLoaded: false });
      const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
      const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
      const [downloadingTrackId, setDownloadingTrackId] = useState(null);
      const [audioDownloadModal, setAudioDownloadModal] = useState(null);

      // --- Saved Audiobooks Library State ---
      const [savedAudiobooks, setSavedAudiobooks] = useState(() => {
        try {
          const raw = localStorage.getItem('gemini_saved_audiobooks');
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          return [];
        }
      });

      const isAudiobookInLibrary = useCallback((bookOrUrl) => {
        if (!bookOrUrl) return false;
        const targetUrl = typeof bookOrUrl === 'string' ? bookOrUrl : bookOrUrl.url;
        const targetTitle = typeof bookOrUrl === 'object' ? bookOrUrl.title : '';
        return (savedAudiobooks || []).some(b => (targetUrl && b.url === targetUrl) || (targetTitle && b.title === targetTitle));
      }, [savedAudiobooks]);

      const saveAudiobookToLibrary = useCallback((book) => {
        if (!book || (!book.title && !book.url)) return;
        setSavedAudiobooks(prev => {
          const list = prev || [];
          const exists = list.some(b => (b.url && b.url === book.url) || (b.title && b.title === book.title));
          if (exists) return list;
          const newEntry = {
            id: 'audio_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: book.title || 'Untitled Audiobook',
            author: book.author || '',
            cover: book.cover || '',
            url: book.url || '',
            duration: book.duration || '',
            totalTracks: book.totalTracks || (book.tracks ? book.tracks.length : 0),
            tracks: book.tracks || null,
            addedAt: Date.now(),
            lastPlayedTrackIndex: 0,
            lastPlayedTrackTitle: '',
            lastPlayedTime: 0,
            lastListenedAt: null
          };
          const next = [newEntry, ...list];
          try {
            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(next));
          } catch (e) {}
          toast(`Added "${newEntry.title}" to Library!`, 'success');
          return next;
        });
      }, []);

      const removeAudiobookFromLibrary = useCallback((bookOrUrl) => {
        if (!bookOrUrl) return;
        const targetUrl = typeof bookOrUrl === 'string' ? bookOrUrl : bookOrUrl.url;
        const targetTitle = typeof bookOrUrl === 'object' ? bookOrUrl.title : '';
        const targetId = typeof bookOrUrl === 'object' ? bookOrUrl.id : '';
        setSavedAudiobooks(prev => {
          const next = (prev || []).filter(b => {
            if (targetId && b.id === targetId) return false;
            if (targetUrl && b.url === targetUrl) return false;
            if (targetTitle && b.title === targetTitle) return false;
            return true;
          });
          try {
            localStorage.setItem('gemini_saved_audiobooks', JSON.stringify(next));
          } catch (e) {}
          toast('Removed audiobook from Library.', 'info');
          return next;
        });
      }, []);

      // --- Ongoing EPUB Continuation & Moon+ Reader Continuity State ---
      const [ongoingEpubModal, setOngoingEpubModal] = useState(null);
      const ongoingEpubInputRef = useRef(null);

      useEffect(() => {
        const attachAudio = () => {
          if (window.SwiftAudioEngine && window.SwiftAudioEngine.Player) {
            return window.SwiftAudioEngine.Player.subscribe(st => {
              setAudioPlayerState(st);
              if (st.currentBook && !activeAudiobook) {
                setActiveAudiobook(st.currentBook);
              }
            });
          }
          return null;
        };

        let unsub = attachAudio();
        if (!unsub) {
          const timer = setInterval(() => {
            unsub = attachAudio();
            if (unsub) clearInterval(timer);
          }, 200);
          return () => { clearInterval(timer); if (unsub) unsub(); };
        }
        return unsub;
      }, []);

      const [isAiSorting, setIsAiSorting] = useState(false);
      const [webImportHistory, setWebImportHistory] = useState(() => {
        try {
          const saved = localStorage.getItem('gemini_web_import_history_meta') || localStorage.getItem('gemini_web_import_history');
          return saved ? JSON.parse(saved) : [];
        } catch (e) {
          return [];
        }
      });
      const historyNovels = webImportHistory || [];
      const [historySearchQuery, setHistorySearchQuery] = useState('');
      const [checkingUpdates, setCheckingUpdates] = useState({});
      const [downloadingUpdates, setDownloadingUpdates] = useState({});
      const [novelUpdateBadges, setNovelUpdateBadges] = useState({});
      const [isBatchChecking, setIsBatchChecking] = useState(false);
      const [collapsedVolumes, setCollapsedVolumes] = useState({});
      const [trashList, setTrashList] = useState([]);
      const [trashCount, setTrashCount] = useState(0);

      const loadTrashCount = useCallback(async () => {
        if (window.GeminiNovelDB) {
          try {
            const list = await window.GeminiNovelDB.getTrashNovels();
            setTrashList(list || []);
            setTrashCount((list || []).length);
          } catch (e) {
            setTrashList([]);
            setTrashCount(0);
          }
        }
      }, []);

      const getNovelFolderOptions = (novel) => {
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
      };
      if (typeof window !== 'undefined') {
        window.getNovelFolderOptions = getNovelFolderOptions;
      }

      const getCustomTitle = (novelOrUrl) => {
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
      };

      const handleSaveNovelRename = async (novel, newTitle) => {
        if (!novel) return;
        const trimmed = (newTitle || '').trim();
        if (!trimmed) {
          toast('Title cannot be empty.', 'warning');
          return;
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

        // 2. Update webImportHistory (state & localStorage)
        setWebImportHistory(prev => {
          const updated = prev.map(item => {
            if (item.id === novelId || (sourceUrl && (item.sourceUrl === sourceUrl || item.url === sourceUrl))) {
              return { ...item, title: trimmed, customTitle: trimmed, originalSourceTitle: item.originalSourceTitle || item.title };
            }
            return item;
          });
          try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated)); } catch(e) {}
          return updated;
        });

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
            console.warn('Failed to update novel title in IndexedDB:', e);
          }
        }

        // 4. Update active sessions if currently active
        setWebImportData(prev => {
          if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
            return { ...prev, title: trimmed, customTitle: trimmed, originalSourceTitle: prev.originalSourceTitle || prev.title };
          }
          return prev;
        });
        setActiveCrawlSession(prev => {
          if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
            const next = { ...prev, title: trimmed, customTitle: trimmed, originalSourceTitle: prev.originalSourceTitle || prev.title };
            try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(next)); } catch(e) {}
            return next;
          }
          return prev;
        });
        if (typeof setActiveNovelRecord === 'function') {
          setActiveNovelRecord(prev => {
            if (prev && (prev.id === novelId || (sourceUrl && (prev.sourceUrl === sourceUrl || prev.url === sourceUrl)))) {
              return { ...prev, title: trimmed, customTitle: trimmed };
            }
            return prev;
          });
        }
        if (typeof readerNovelId !== 'undefined' && readerNovelId && (readerNovelId === novelId || readerNovelId === novel.title)) {
          setReaderNovelTitle(trimmed);
        }

        toast(`Renamed novel to "${trimmed}"! Future chapter updates will use this name. ✨`, 'success');
        setRenameModalNovel(null);
      };

      const saveNovelToHistory = async (novelData) => {
        if (!novelData || !novelData.chapters || novelData.chapters.length === 0) return;
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
        const existingMeta = (webImportHistory || []).find(n => (novelId && n.id === novelId) || (n.title && novelData.title && cleanT(n.title) === cleanT(novelData.title)));
        const inSavedSpace = novelData.inSavedSpace !== undefined
          ? !!novelData.inSavedSpace
          : (existingMeta?.inSavedSpace !== undefined ? !!existingMeta.inSavedSpace : false);
        const folderOpts = getNovelFolderOptions(novelData);
        const folderTreeUri = novelData.folderTreeUri || folderOpts.treeUri || existingMeta?.folderTreeUri || '';
        const folderPath = novelData.folderPath || folderOpts.folderPath || existingMeta?.folderPath || '';
        let coverArt = novelData.cover || existingMeta?.cover || '';
        if (!coverArt && novelData.title) {
          const matchedAny = (webImportHistory || []).find(n => n.cover && cleanT(n.title) === cleanT(novelData.title));
          if (matchedAny?.cover) coverArt = matchedAny.cover;
        }
        if (!coverArt && typeof currentDocCover !== 'undefined' && currentDocCover) {
          coverArt = currentDocCover;
        }
        if (!coverArt && typeof localStorage !== 'undefined') {
          coverArt = localStorage.getItem('gemini_current_doc_cover') || '';
        }

        const customTitle = novelData.customTitle || getCustomTitle(novelData.sourceUrl || novelData.url || novelId) || existingMeta?.customTitle;
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
            console.warn('GeminiNovelDB save error:', e);
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

        setWebImportHistory(prev => {
          const updated = [metaRecord, ...prev.filter(n => n.id !== metaRecord.id && (!metaRecord.title || (n.title || '').trim().toLowerCase() !== metaRecord.title.trim().toLowerCase()))].slice(0, 50);
          try {
            localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        if (!isIncomplete && cleanChapters.length >= totalChapters) {
          localStorage.removeItem('gemini_active_crawl_session');
          setActiveCrawlSession(null);
        }
      };

      const toggleNovelSavedSpace = async (novelId, novelFallback = null) => {
        let full = await loadFullNovel({ id: novelId, title: novelFallback?.title });
        if (!full && novelFallback) {
          full = { ...novelFallback };
        }
        if (!full) return;
        const newSaved = !full.inSavedSpace;
        full.inSavedSpace = newSaved;

        // Guarantee folder options and cover are preserved
        const folderOpts = getNovelFolderOptions(full);
        if (folderOpts.folderPath) full.folderPath = folderOpts.folderPath;
        if (folderOpts.treeUri) full.folderTreeUri = folderOpts.treeUri;
        if (!full.cover && novelFallback?.cover) full.cover = novelFallback.cover;

        if (window.GeminiNovelDB) {
          try { await window.GeminiNovelDB.saveNovel(full); } catch(e) {}
        }
        setWebImportHistory(prev => {
          const list = prev || [];
          const exists = list.some(m => (full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()));
          let updated;
          if (exists) {
            updated = list.map(m => ((full.id && m.id === full.id) || (m.title && full.title && m.title.trim().toLowerCase() === full.title.trim().toLowerCase()))
              ? { ...m, inSavedSpace: newSaved, sourceUrl: full.sourceUrl || m.sourceUrl || full.url || m.url, cover: full.cover || m.cover, folderPath: full.folderPath || m.folderPath, folderTreeUri: full.folderTreeUri || m.folderTreeUri }
              : m);
          } else {
            updated = [{ ...full, inSavedSpace: newSaved }, ...list];
          }
          try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated)); } catch(e) {}
          return updated;
        });

        // Also update active session / import data states so UI stays reactive
        setActiveCrawlSession(prev => {
          if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
            const next = { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
            try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(next)); } catch(e) {}
            return next;
          }
          return prev;
        });
        setWebImportData(prev => {
          if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
            return { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
          }
          return prev;
        });
        if (typeof setActiveNovelRecord === 'function') {
          setActiveNovelRecord(prev => {
            if (prev && ((full.id && prev.id === full.id) || (full.title && prev.title && prev.title.trim().toLowerCase() === full.title.trim().toLowerCase()))) {
              return { ...prev, inSavedSpace: newSaved, folderPath: full.folderPath || prev.folderPath, folderTreeUri: full.folderTreeUri || prev.folderTreeUri };
            }
            return prev;
          });
        }

        toast(newSaved ? `"${full.title}" saved to your Special Space! ⭐` : `Removed from Special Space.`, 'info');
      };

      const handleCheckNovelUpdate = async (item) => {
        let sourceUrl = item.sourceUrl || item.url || item.webUrl;
        let targetItem = item;
        const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
        const itemClean = cleanT(item.title);

        // 1. Try loading full novel from IndexedDB / store
        const full = await loadFullNovel(item);
        if (full) {
          targetItem = { ...item, ...full };
          if (full.sourceUrl || full.url || full.webUrl) {
            sourceUrl = full.sourceUrl || full.url || full.webUrl;
          }
        }

        // 2. If sourceUrl still missing, check matching original novel in webImportHistory
        if (!sourceUrl) {
          const matchOrig = (webImportHistory || []).find(n => n && n.id !== item.id && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
          if (matchOrig) {
            sourceUrl = matchOrig.sourceUrl || matchOrig.url;
          }
        }

        // 3. If sourceUrl still missing, check matching novel across all IndexedDB records
        if (!sourceUrl && window.GeminiNovelDB) {
          try {
            const all = await window.GeminiNovelDB.getAllNovels();
            const dbMatch = (all || []).find(n => n && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
            if (dbMatch) {
              sourceUrl = dbMatch.sourceUrl || dbMatch.url;
            }
          } catch (e) {}
        }

        // 4. If sourceUrl still missing, inspect chapter URLs & chapterList
        if (!sourceUrl) {
          const chs = targetItem.rawChapters || targetItem.chapters || [];
          const chList = targetItem.chapterList || [];
          const chWithUrl = chs.find(c => c && c.url) || chList.find(c => c && c.url);
          const chUrl = chWithUrl?.url || '';
          if (chUrl.includes('royalroad.com/fiction/')) {
            const m = chUrl.match(/(https?:\/\/[^\/]*royalroad\.com\/fiction\/\d+(?:\/[^\/]+)?)/i);
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

        // 4b. If still missing, check activeCrawlSession
        if (!sourceUrl && activeCrawlSession) {
          if ((activeCrawlSession.id === item.id || cleanT(activeCrawlSession.title) === itemClean) && (activeCrawlSession.sourceUrl || activeCrawlSession.url)) {
            sourceUrl = activeCrawlSession.sourceUrl || activeCrawlSession.url;
          }
        }

        // 5. If recovered, persist permanently so future checks are instantaneous
        if (sourceUrl) {
          targetItem.sourceUrl = sourceUrl;
          item.sourceUrl = sourceUrl;
          setWebImportHistory(prev => {
            const upd = prev.map(p => p.id === item.id ? { ...p, sourceUrl } : p);
            try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(upd)); } catch(e) {}
            return upd;
          });
          if (window.GeminiNovelDB && targetItem.id) {
            try { window.GeminiNovelDB.saveNovel(targetItem); } catch(e) {}
          }
        }

        if (!sourceUrl) {
          toast(`Cannot check updates: "${item.title}" was not imported from a web URL.`, 'warning');
          return;
        }
        setCheckingUpdates(prev => ({ ...prev, [item.id]: true }));
        try {
          targetItem.sourceUrl = targetItem.sourceUrl || sourceUrl;
          // Self-heal: If volumeCount is missing in metadata, derive it from loaded chapters
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
              setWebImportHistory(prev => {
                const upd = prev.map(p => p.id === item.id ? { ...p, volumeCount: maxV } : p);
                try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(upd)); } catch(e) {}
                return upd;
              });
            }
          }
          const res = await window.WebNovelImporter?.checkNovelUpdates(targetItem, (msg) => {
            toast(msg, 'info');
          });
          if (res && res.hasUpdates) {
            setNovelUpdateBadges(prev => ({
              ...prev,
              [item.id]: {
                newCount: res.newCount,
                remoteTotal: res.remoteCount,
                isVolumeBased: !!res.isVolumeBased,
                remoteChapterList: res.remoteChapterList || []
              }
            }));
            const unit = res.isVolumeBased ? (res.newCount === 1 ? 'new volume' : 'new volumes') : (res.newCount === 1 ? 'new chapter' : 'new chapters');
            toast(`Found ${res.newCount} ${unit} for "${item.title}"! 🎉`, 'success');
          } else if (res && !res.error) {
            setNovelUpdateBadges(prev => {
              const next = { ...prev };
              delete next[item.id];
              return next;
            });
            const unit = res.isVolumeBased ? 'vol' : 'ch';
            toast(`"${item.title}" is already up to date (${res.localCount || targetItem.volumeCount || item.chapterCount} ${unit}).`, 'info');
          } else if (res && res.error) {
            toast(`Check failed: ${res.error}`, 'error');
          }
        } catch(e) {
          toast(`Check error: ${e.message}`, 'error');
        } finally {
          setCheckingUpdates(prev => ({ ...prev, [item.id]: false }));
        }
      };

      const handleDownloadNewChapters = async (item) => {
        if (!item) return;
        const novelKey = item.id;
        setDownloadingUpdates(prev => ({ ...prev, [novelKey]: true }));
        try {
          const full = await loadFullNovel(item);
          const targetItem = full ? { ...item, ...full } : item;
          let sourceUrl = targetItem.sourceUrl || item.sourceUrl || full?.sourceUrl || targetItem.url || item.url || full?.url;

          if (!sourceUrl) {
            const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
            const itemClean = cleanT(item.title);
            const matchOrig = (webImportHistory || []).find(n => n && n.id !== item.id && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
            if (matchOrig) {
              sourceUrl = matchOrig.sourceUrl || matchOrig.url;
            }
          }
          if (!sourceUrl && window.GeminiNovelDB) {
            try {
              const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
              const itemClean = cleanT(item.title);
              const all = await window.GeminiNovelDB.getAllNovels();
              const dbMatch = (all || []).find(n => n && cleanT(n.title) === itemClean && (n.sourceUrl || n.url));
              if (dbMatch) sourceUrl = dbMatch.sourceUrl || dbMatch.url;
            } catch (e) {}
          }
          if (!sourceUrl) {
            const chs = targetItem.rawChapters || targetItem.chapters || [];
            const chUrl = chs.find(c => c && c.url)?.url || '';
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
          if (sourceUrl) {
            targetItem.sourceUrl = sourceUrl;
            item.sourceUrl = sourceUrl;
          }
          if (!sourceUrl) {
            toast('No source URL found for this novel.', 'error');
            return;
          }
          const isLnori = /lnori\.(?:org|com)/i.test(sourceUrl);
          const existingRaw = (targetItem.rawChapters && targetItem.rawChapters.length > 0)
            ? targetItem.rawChapters
            : (targetItem.chapters || []);
          const prevCount = existingRaw.length;
          const badge = novelUpdateBadges[item.id] || (targetItem.id ? novelUpdateBadges[targetItem.id] : null);

          toast(`Fetching updates for "${targetItem.title || item.title || 'Novel'}"...`, 'info');
          if (typeof setEpubPackagingModal === 'function') {
            setEpubPackagingModal({
              title: targetItem.title || item.title || 'Novel Updates',
              status: `Connecting to source and discovering chapters…`,
              pct: 5
            });
          }

          const res = await window.WebNovelImporter?.importUrl(sourceUrl, (msg, pct) => {
            if (typeof setEpubPackagingModal === 'function') {
              setEpubPackagingModal({
                title: targetItem.title || item.title || 'Novel Updates',
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
            const customTitle = targetItem.customTitle || getCustomTitle(sourceUrl) || getCustomTitle(targetItem.id) || targetItem.title;
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
            await saveNovelToHistory(updatedNovel);
            setNovelUpdateBadges(prev => {
              const next = { ...prev };
              if (item.id) delete next[item.id];
              if (targetItem.id) delete next[targetItem.id];
              return next;
            });

            if (hasNew) {
              toast(`Updated "${updatedNovel.title}" in library! (+${fetchedChapters.length - prevCount} new chapters, ${fetchedChapters.length} total)`, 'success');
            } else {
              toast(`All ${fetchedChapters.length} chapters verified. Packaging EPUB...`, 'info');
            }

            if (isLnori) {
              // Direct clean Lnori EPUB packaging with volume TOC & cover art
              await exportCleanLnoriEpub(updatedNovel);
            } else {
              // Packaging & Download updated raw EPUB
              const chs = fetchedChapters;
              const bookTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(updatedNovel.title, chs) : (updatedNovel.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
              const bookAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(updatedNovel.author) : (updatedNovel.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
              try {
                if (typeof setEpubPackagingModal === 'function') {
                  setEpubPackagingModal({ title: bookTitle, status: `Packaging ${chs.length} chapters into EPUB…`, pct: 95 });
                }
                const opts = typeof getEpubOptions === 'function'
                  ? getEpubOptions({ novelId: updatedNovel.id || sourceUrl || bookTitle, coverUrl: updatedNovel.cover || '' })
                  : { novelId: updatedNovel.id, coverUrl: updatedNovel.cover || '' };
                const blob = await generateEpubFromChapters(chs, bookTitle, bookAuthor, updatedNovel.targetLang || 'en', (status, pct, elapsed) => {
                  if (typeof setEpubPackagingModal === 'function') {
                    setEpubPackagingModal({ title: bookTitle, status, pct, elapsed });
                  }
                }, opts);
                const isInc = updatedNovel.isIncomplete || (updatedNovel.totalChapterCount && chs.length < updatedNovel.totalChapterCount);
                const epubFileName = getEpubFileName(bookTitle, chs.length, isInc);
                await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(updatedNovel));
                toast(`Downloaded updated raw EPUB (${chs.length} chapters)! 📥`, 'success');
              } catch (epubErr) {
                toast(`Raw EPUB packaging error: ${epubErr.message}`, 'error');
              }
            }
          } else {
            toast(`No chapters were retrieved for "${item.title}". Please check internet connection or URL.`, 'warning');
          }
        } catch (err) {
          console.error('[handleDownloadNewChapters]', err);
          toast(`Update failed: ${err.message}`, 'error');
        } finally {
          setDownloadingUpdates(prev => ({ ...prev, [novelKey]: false }));
          if (typeof setEpubPackagingModal === 'function') setEpubPackagingModal(null);
        }
      };

      const handleUpdateTranslateAndMakeEpub = async (item) => {
        if (!item) return;
        const novelKey = item.id;
        setDownloadingUpdates(prev => ({ ...prev, [novelKey]: true }));
        try {
          const full = await loadFullNovel(item);
          const targetItem = full ? { ...item, ...full } : item;
          const sourceUrl = targetItem.sourceUrl || item.sourceUrl || full?.sourceUrl;
          if (!sourceUrl) return toast('No source URL found for this novel.', 'error');

          const existingRaw = targetItem.rawChapters || targetItem.chapters || [];
          const prevCount = existingRaw.length;
          const badge = novelUpdateBadges[item.id] || (targetItem.id ? novelUpdateBadges[targetItem.id] : null);
          toast(`Fetching newly published chapters for "${targetItem.title || item.title}"…`, 'info');

          if (typeof setEpubPackagingModal === 'function') {
            setEpubPackagingModal({
              title: targetItem.title || item.title || 'Novel Updates',
              status: `Fetching new chapters from source…`,
              pct: 10
            });
          }

          let updatedNovel = targetItem;
          const res = await window.WebNovelImporter?.importUrl(sourceUrl, (msg, pct) => {
            if (typeof setEpubPackagingModal === 'function') {
              setEpubPackagingModal({
                title: targetItem.title || item.title || 'Novel Updates',
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
          if (res && res.chapters && res.chapters.length > prevCount) {
            const customTitle = targetItem.customTitle || getCustomTitle(sourceUrl) || getCustomTitle(targetItem.id) || targetItem.title;
            updatedNovel = {
              ...targetItem,
              title: customTitle || targetItem.title,
              customTitle: customTitle || targetItem.customTitle,
              chapters: res.chapters,
              rawChapters: res.chapters,
              chapterCount: res.chapters.length,
              totalChapterCount: res.totalChapterCount || res.chapters.length,
              chapterList: res.chapterList || targetItem.chapterList || res.chapters.map((c, i) => ({ url: c.url, title: c.title || `Chapter ${i + 1}` })),
              isIncomplete: false,
              sourceUrl: sourceUrl
            };
            await saveNovelToHistory(updatedNovel);
            setNovelUpdateBadges(prev => {
              const next = { ...prev };
              if (item.id) delete next[item.id];
              if (targetItem.id) delete next[targetItem.id];
              return next;
            });
          } else {
            toast(`No new chapters found online for "${item.title}". (Local: ${prevCount} ch)`, 'info');
            return;
          }


          const allRawChs = updatedNovel.rawChapters || updatedNovel.chapters || [];
          const newCount = allRawChs.length - prevCount;
          const cleanCh = (c) => {
            const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
            const raw = c?.text || c?.content || '';
            return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
          };

          const existingTranslated = updatedNovel.translatedChapters || full?.translatedChapters || full?.originalChapters || [];
          const prefilledChapters = allRawChs.map((c, i) => ({
            title: c?.title || `Chapter ${i + 1}`,
            text: cleanCh(c),
            content: cleanCh(c)
          }));
          const prefilledNewChapters = allRawChs.map((c, i) => {
            if (i < prevCount) {
              const prevTrans = existingTranslated[i];
              if (prevTrans && (prevTrans.content || prevTrans.text)) {
                return {
                  title: prevTrans.title || c?.title || `Chapter ${i + 1}`,
                  content: prevTrans.content || prevTrans.text,
                  originalTitle: c?.title
                };
              }
              return {
                title: c?.title || `Chapter ${i + 1}`,
                content: cleanCh(c),
                originalTitle: c?.title
              };
            }
            return null;
          });

          const prefilledAssembled = prefilledNewChapters.filter(Boolean).map(c => `${c?.title || ''}\n\n${c?.content || ''}`).join('\n\n\n');
          setInputText(prefilledChapters.map(c => `# ${c?.title || ''}\n\n${c?.content || ''}`).join('\n\n'));
          setChapters(prefilledChapters);
          setTranslatedChapters(prefilledNewChapters);
          setAssembledText(prefilledAssembled);
          setActiveNovelRecord(updatedNovel);
          setFileName(updatedNovel.title);

          const jobId = 'update_' + String(updatedNovel.id || updatedNovel.title).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + allRawChs.length;
          const sessionObj = {
            id: jobId,
            type: 'ebook',
            title: updatedNovel.title,
            ctx: '',
            completedCount: prevCount,
            currentChapterIdx: prevCount,
            currentChunkIdx: 0,
            allParts: prefilledNewChapters.map(c => c ? `${c.title || ''}\n\n${c.content || ''}` : ''),
            newChapters: prefilledNewChapters,
            totalChunks: allRawChs.length,
            total: allRawChs.length,
            chapters: prefilledChapters,
            isEpub: false,
            timestamp: Date.now(),
            isDeltaUpdate: true,
            deltaStart: prevCount + 1,
            deltaEnd: allRawChs.length,
            novelId: updatedNovel.id
          };

          activeSessionRef.current = sessionObj;
          setActiveSession(sessionObj);
          setSavedTranslationSession(sessionObj);
          setIsTranslationPaused(true);

          if (window.GeminiNovelDB) {
            await window.GeminiNovelDB.saveTranslationSession(sessionObj);
          }
          try {
            localStorage.setItem(jobId, JSON.stringify(sessionObj));
          } catch(e) {}

          setActiveTab('text');
          toast(`Staged ${newCount} new chapters! Chapters 1–${prevCount} preserved. Review below and tap "Translate Only New Chapters".`, 'success');
        } catch (fetchErr) {
          toast(`Fetch failed: ${fetchErr.message}`, 'error');
        } finally {
          setDownloadingUpdates(prev => ({ ...prev, [novelKey]: false }));
          if (typeof setEpubPackagingModal === 'function') setEpubPackagingModal(null);
        }
      };

      const handleCheckAllUpdates = async () => {
        const webNovels = webImportHistory.filter(b => b.sourceUrl && b.sourceUrl.startsWith('http'));
        if (webNovels.length === 0) {
          toast('No web novels with source URLs found in library.', 'info');
          return;
        }
        setIsBatchChecking(true);
        toast(`Checking updates for ${webNovels.length} novel(s)...`, 'info');
        let updatesFound = 0;
        for (let i = 0; i < webNovels.length; i++) {
          const b = webNovels[i];
          setCheckingUpdates(prev => ({ ...prev, [b.id]: true }));
          try {
            const full = await loadFullNovel(b);
            const targetB = full ? { ...b, ...full } : b;
            const res = await window.WebNovelImporter?.checkNovelUpdates(targetB);
            if (res && res.hasUpdates) {
              updatesFound++;
              setNovelUpdateBadges(prev => ({
                ...prev,
                [b.id]: {
                  newCount: res.newCount,
                  remoteTotal: res.remoteCount,
                  isVolumeBased: !!res.isVolumeBased,
                  remoteChapterList: res.remoteChapterList || []
                }
              }));
            }
          } catch(e) {}
          setCheckingUpdates(prev => ({ ...prev, [b.id]: false }));
          if (i < webNovels.length - 1) await new Promise(r => setTimeout(r, 1000));
        }
        setIsBatchChecking(false);
        toast(updatesFound > 0 ? `Updates found for ${updatesFound} novel(s)! Check badges in Library.` : 'All novels are up to date! ✨', 'success');
      };

      const loadFullNovel = async (meta) => {
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
            const match = (all || []).find(n => n.id === meta.id || n.title === meta.title);
            if (match && (match.rawChapters?.length > 0 || match.chapters?.length > 0 || match.translatedChapters?.length > 0 || match.epubBlob)) return match;
          } catch(e) {}
        }
        // 3. Fallback: check if meta already contains rawChapters or chapters or epubBlob
        if (meta.rawChapters?.length > 0 || meta.chapters?.length > 0 || meta.translatedChapters?.length > 0 || meta.epubBlob) return meta;
        // 4. Fallback: check currently active webImportData
        if (webImportData && webImportData.title === meta.title && webImportData.chapters?.length > 0) {
          return { ...webImportData, rawChapters: webImportData.chapters };
        }
        // 5. Fallback: check legacy localStorage storage
        try {
          const old = JSON.parse(localStorage.getItem('gemini_web_import_history') || '[]');
          const found = (old || []).find(n => n.id === (meta.id || '')) || (old || []).find(n => n.title === meta.title);
          if (found && (found.chapters?.length || found.rawChapters?.length || found.translatedChapters?.length)) {
            return { title: found.title, author: found.author, rawChapters: found.chapters || found.rawChapters || found.translatedChapters, originalChapters: found.originalChapters || null };
          }
        } catch (e) {}
        return null;
      };

      const loadNovelFromHistory = async (meta) => {
        try {
          toast(` Loading "${meta.title}" from library...`, 'info');
          const fullNovel = await loadFullNovel(meta);
          if (!fullNovel || (!fullNovel.rawChapters && !fullNovel.chapters)) {
            throw new Error('Novel chapter data not found in local library store.');
          }
          const rawChs = fullNovel.rawChapters || fullNovel.chapters || [];
          const loadedData = {
            title: fullNovel.title,
            author: fullNovel.author,
            summary: fullNovel.summary,
            tags: fullNovel.tags,
            chapters: rawChs,
            rawChapters: rawChs,
            isEpub: fullNovel.isEpub,
            inSavedSpace: !!fullNovel.inSavedSpace,
            sourceUrl: fullNovel.sourceUrl
          };
          setWebImportData(loadedData);
          toast(` Loaded "${loadedData.title}" (${loadedData.chapters.length} chapters)!`, 'success');
          return loadedData;
        } catch (err) {
          console.error('Failed to load novel from library:', err);
          toast('Failed to load: ' + err.message, 'error');
          return null;
        }
      };

      const deleteNovelFromHistory = async (id) => {
        const itemToDelete = (webImportHistory || []).find(n => n.id === id);
        if (window.GeminiNovelDB) {
          try {
            await window.GeminiNovelDB.moveToTrash(id);
          } catch(e) {}
        }
        setWebImportHistory(prev => {
          const updated = prev.filter(item => item.id !== id);
          try {
            localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        loadTrashCount();
        toast(`Moved "${itemToDelete?.title || 'novel'}" to Recycle Bin`, 'info', {
          label: 'Undo',
          onClick: async () => {
            await handleRestoreNovel(id);
          }
        });
      };

      const handleClearScopedBooks = async (booksToClear, scopeName) => {
        if (!booksToClear || booksToClear.length === 0) return;
        const count = booksToClear.length;
        const idsToClear = booksToClear.map(b => b.id).filter(Boolean);
        const idSet = new Set(idsToClear);

        if (window.GeminiNovelDB) {
          try {
            await window.GeminiNovelDB.moveMultipleToTrash(idsToClear);
          } catch (e) {
            console.warn('Failed to move to trash:', e);
          }
        }

        const snapshot = [...booksToClear];
        window.__gemini_last_cleared_snapshot = snapshot;

        setWebImportHistory(prev => {
          const updated = prev.filter(b => !idSet.has(b.id));
          try {
            localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        loadTrashCount();

        toast(`Moved ${count} ${scopeName} book(s) to Recycle Bin`, 'info', {
          label: 'Undo',
          onClick: async () => {
            await handleRestoreSnapshot(snapshot);
          }
        });
      };

      const handleClearSavedSpace = async (books) => {
        if (!books || books.length === 0) return;
        for (const b of books) {
          if (b.id) await toggleNovelSavedSpace(b.id, b);
        }
        toast(`Removed ${books.length} novel(s) from Saved Space.`, 'info');
      };

      const clearAllNovelHistory = async () => {
        const allBooks = [...(webImportHistory || [])];
        if (allBooks.length === 0) return;

        if (window.GeminiNovelDB) {
          try {
            await window.GeminiNovelDB.moveAllToTrash();
          } catch (e) {}
        }
        window.__gemini_last_cleared_snapshot = allBooks;
        setWebImportHistory([]);
        try { localStorage.removeItem('gemini_web_import_history_meta'); } catch (e) {}

        loadTrashCount();

        toast(`Moved all ${allBooks.length} books to Recycle Bin`, 'info', {
          label: 'Undo',
          onClick: async () => {
            await handleRestoreSnapshot(allBooks);
          }
        });
      };

      const handleRestoreNovel = async (id) => {
        if (window.GeminiNovelDB) {
          await window.GeminiNovelDB.restoreFromTrash(id);
          const restored = await window.GeminiNovelDB.getNovel(id);
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
            setWebImportHistory(prev => {
              const next = [meta, ...prev.filter(n => n.id !== id)];
              try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(next)); } catch (e) {}
              return next;
            });
            loadTrashCount();
            toast(`Restored "${restored.title}" to library!`, 'success');
          }
        }
      };

      const handleRestoreSnapshot = async (snapshot) => {
        if (!snapshot || snapshot.length === 0) return;
        if (window.GeminiNovelDB) {
          for (const b of snapshot) {
            if (b.id) await window.GeminiNovelDB.restoreFromTrash(b.id);
          }
        }
        setWebImportHistory(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const restored = snapshot.filter(b => b.id && !existingIds.has(b.id));
          const next = [...restored, ...prev];
          try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(next)); } catch (e) {}
          return next;
        });
        loadTrashCount();
        toast(`Restored ${snapshot.length} book(s) to library!`, 'success');
      };

      const handleRestoreAllTrash = async () => {
        if (window.GeminiNovelDB) {
          const restoredItems = await window.GeminiNovelDB.restoreAllFromTrash();
          if (restoredItems && restoredItems.length > 0) {
            const restoredMetas = restoredItems.map(n => ({
              id: n.id,
              title: n.title,
              author: n.author,
              summary: n.summary,
              cover: n.cover,
              tags: n.tags,
              chapterCount: n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0),
              totalChapterCount: n.totalChapterCount || (n.chapterList ? n.chapterList.length : (n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0))),
              volumeCount: n.volumeCount,
              isIncomplete: !!n.isIncomplete,
              isTranslated: !!n.isTranslated || (n.title || '').includes('(Translated)'),
              inSavedSpace: !!n.inSavedSpace,
              wordCount: n.wordCount,
              timestamp: n.timestamp || new Date().toISOString(),
              isEpub: n.isEpub,
              sourceUrl: n.sourceUrl
            }));
            setWebImportHistory(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const adding = restoredMetas.filter(m => !existingIds.has(m.id));
              const next = [...adding, ...prev];
              try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(next)); } catch (e) {}
              return next;
            });
            loadTrashCount();
            toast(`Restored all ${restoredItems.length} novel(s) to library!`, 'success');
          }
        }
      };

      const handlePermanentDelete = async (id) => {
        if (window.GeminiNovelDB) {
          await window.GeminiNovelDB.deleteTrashNovel(id);
        }
        loadTrashCount();
        toast('Permanently deleted from Recycle Bin.', 'info');
      };

      const handleEmptyTrash = async () => {
        if (window.GeminiNovelDB) {
          await window.GeminiNovelDB.emptyTrash();
        }
        loadTrashCount();
        toast('Recycle Bin emptied.', 'info');
      };

      const handleRestoreFromEpubFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        toast(`Reading ${files.length} EPUB file(s)...`, 'info');
        let restoredCount = 0;
        for (const f of files) {
          try {
            if (!f.name.toLowerCase().endsWith('.epub')) continue;
            const epubData = await readEpub(f);
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
              await saveNovelToHistory(novelData);
              restoredCount++;
            }
          } catch (err) {
            console.warn('EPUB restore failed for', f.name, err);
          }
        }
        if (restoredCount > 0) {
          toast(`Successfully restored ${restoredCount} novel(s) into your library!`, 'success');
        } else {
          toast('No readable EPUB chapters found.', 'warning');
        }
        e.target.value = '';
      };

      const handleReindexFromTranslationHistory = async () => {
        try {
          const dbHist = await dbGetAll('history');
          if (!dbHist || dbHist.length === 0) {
            return toast('No translation history entries found in database.', 'info');
          }
          let recoveredCount = 0;
          const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+)/;
          for (const entry of dbHist) {
            const out = entry.fullOutput || entry.outputPreview || '';
            const chaps = [];
            let cur = null;
            for (const line of out.split(/\r?\n/)) {
              const t = line.trim();
              if (heading.test(t)) { if (cur) chaps.push(cur); cur = { title: t, content: '' }; }
              else if (cur) cur.content += line + '\n';
              else if (t) cur = { title: 'Chapter 1', content: line + '\n' };
            }
            if (cur) chaps.push(cur);
            if (chaps.length >= 2) {
              const title = ((chaps[0].title || '').replace(heading, '') || 'Translated Book').trim() + ' (Translated)';
              const exists = (webImportHistory || []).some(n => (n.title || '').trim().toLowerCase() === title.trim().toLowerCase());
              if (!exists) {
                await saveNovelToHistory({
                  title,
                  author: 'Gemini Translator',
                  isTranslated: true,
                  chapters: chaps.map(c => ({ title: c.title, content: c.content.trim() })),
                  originalText: entry.fullInput || ''
                });
                recoveredCount++;
              }
            }
          }
          if (recoveredCount > 0) {
            toast(`Recovered ${recoveredCount} novel(s) from translation history!`, 'success');
          } else {
            toast('No new translated books to recover from history.', 'info');
          }
        } catch (e) {
          toast('Recovery scan failed: ' + e.message, 'error');
        }
      };

      // ══════════════════════════════════════════════════════════════════════════
      // ONGOING EPUB CONTINUATION & MOON+ READER CONTINUITY ENGINE
      // ══════════════════════════════════════════════════════════════════════════
      const handleSearchContinuationSources = async (query) => {
        const cleanQuery = (query || '').trim();
        if (!cleanQuery) return;
        setOngoingEpubModal(prev => prev ? { ...prev, isSearchingSources: true, continuationSources: [] } : null);
        try {
          let results = [];
          // 1. Built-in scrapers
          if (window.WebNovelImporter?.searchNovels) {
            try {
              const scraperResults = await window.WebNovelImporter.searchNovels(cleanQuery, 'all');
              if (Array.isArray(scraperResults)) results.push(...scraperResults);
            } catch (e) {
              console.warn('[handleSearchContinuationSources] Scraper search error:', e);
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
              console.warn('[handleSearchContinuationSources] Plugin search error:', e);
            }
          }
          // Deduplicate by URL
          const seenUrls = new Set();
          const deduped = [];
          for (const r of results) {
            const u = (r.url || r.path || '').replace(/\/$/, '');
            if (u && !seenUrls.has(u)) {
              seenUrls.add(u);
              deduped.push(r);
            }
          }

          setOngoingEpubModal(prev => {
            if (!prev) return null;
            return {
              ...prev,
              isSearchingSources: false,
              continuationSources: deduped
            };
          });
        } catch (err) {
          console.error('[handleSearchContinuationSources] Error:', err);
          setOngoingEpubModal(prev => prev ? { ...prev, isSearchingSources: false } : null);
        }
      };

      const handleSelectContinuationSource = async (srcItem) => {
        const targetUrl = srcItem?.url || srcItem?.path;
        if (!targetUrl) return;
        const srcName = srcItem?.source || srcItem?.name || 'source';
        toast(`Switching to ${srcName}…`, 'info');
        setOngoingEpubModal(prev => prev ? {
          ...prev,
          selectedSource: srcItem,
          sourceUrl: targetUrl,
          showSourceSwitcher: false
        } : null);
        await handleScanContinuationToc(targetUrl, ongoingEpubModal?.existingCount);
      };

      const handleSelectOngoingEpubFile = async (file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.epub')) {
          return toast('Please select a valid .epub file.', 'warning');
        }
        try {
          toast(`Inspecting "${file.name}"…`, 'info');
          const epub = await readEpub(file);
          if (!epub || !epub.chapters || epub.chapters.length === 0) {
            return toast('No readable chapters found in this EPUB.', 'warning');
          }
          const cleanTitle = (epub.title || file.name.replace(/\.epub$/i, '')).replace(/\s*-\s*\d+\s*chs?$/i, '').trim();
          const existingCount = epub.chapters.length;
          const detectedSource = epub.sourceUrl || '';

          const fOpts = getNovelFolderOptions({ id: epub.uuid, title: cleanTitle, sourceUrl: detectedSource });
          setOngoingEpubModal({
            isOpen: true,
            file,
            title: cleanTitle,
            searchQuery: cleanTitle,
            author: epub.author || 'Author',
            cover: epub.cover || '',
            uuid: epub.uuid || '',
            chapters: epub.chapters,
            existingCount,
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
            startChapter: existingCount + 1,
            endChapter: existingCount + 1,
            isFetching: false,
            progress: { status: '', pct: 0, elapsed: '' }
          });

          handleSearchContinuationSources(cleanTitle);

          if (detectedSource && /^https?:\/\//i.test(detectedSource)) {
            handleScanContinuationToc(detectedSource, existingCount);
          }
        } catch (err) {
          console.error('Failed to parse EPUB for continuation:', err);
          toast('Failed to inspect EPUB: ' + err.message, 'error');
        }
      };

      const handleOpenContinuationForNovel = async (novelItem) => {
        try {
          const full = await loadFullNovel(novelItem);
          if (!full) return toast('Novel data not found in library.', 'error');
          let chs = full.translatedChapters || full.rawChapters || full.chapters || [];
          let epubMeta = null;

          // CRITICAL FIX: If full.epubBlob exists, parse the authoritative chapters directly from the EPUB container!
          // This guarantees 100% parity with selecting the EPUB file from device storage and never misses Chapter 4.
          if (full.epubBlob && !full.isEdited && typeof readEpub === 'function') {
            try {
              epubMeta = await readEpub(full.epubBlob);
              if (epubMeta && epubMeta.chapters && epubMeta.chapters.length > 0) {
                chs = epubMeta.chapters;
              }
            } catch (err) {
              console.warn('Could not parse full.epubBlob with readEpub, falling back to stored chapters:', err);
            }
          }

          if (chs.length === 0) return toast('No chapters found in this novel.', 'warning');

          const cleanTitle = (epubMeta?.title || full.title || 'Novel').replace(/\s*-\s*\d+\s*chs?$/i, '').trim();
          const existingCount = chs.length;
          const detectedSource = epubMeta?.sourceUrl || full.sourceUrl || full.url || '';
          const fOpts = getNovelFolderOptions(full || novelItem);

          setOngoingEpubModal({
            isOpen: true,
            file: full.epubBlob || null,
            title: cleanTitle,
            searchQuery: cleanTitle,
            author: epubMeta?.author || full.author || 'Author',
            cover: epubMeta?.cover || full.cover || '',
            uuid: epubMeta?.uuid || full.uuid || full.id || '',
            chapters: chs,
            existingCount,
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
            startChapter: existingCount + 1,
            endChapter: existingCount + 1,
            isFetching: false,
            progress: { status: '', pct: 0, elapsed: '' }
          });

          handleSearchContinuationSources(cleanTitle);

          if (detectedSource && /^https?:\/\//i.test(detectedSource)) {
            handleScanContinuationToc(detectedSource, existingCount);
          }
        } catch (e) {
          toast('Error opening continuation: ' + e.message, 'error');
        }
      };

      const handleScanContinuationToc = async (url, existingCount) => {
        const targetUrl = (url || ongoingEpubModal?.sourceUrl || '').trim();
        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
          return toast('Please enter a valid web novel source URL.', 'warning');
        }
        setOngoingEpubModal(prev => prev ? { ...prev, isScanningToc: true, sourceUrl: targetUrl } : null);
        try {
          const remote = await window.WebNovelImporter.importUrl(targetUrl, () => {}, { tocOnly: true });
          const totalOnline = (remote && typeof remote.totalChapterCount === 'number')
            ? remote.totalChapterCount
            : (remote?.chapterList ? remote.chapterList.length : (remote?.chapters ? remote.chapters.length : 0));

          if (!totalOnline || totalOnline === 0) {
            toast('Failed to retrieve online chapters from this URL.', 'warning');
            setOngoingEpubModal(prev => prev ? { ...prev, isScanningToc: false } : null);
            return;
          }

          setOngoingEpubModal(prev => {
            if (!prev) return null;
            const curExisting = prev.existingCount || existingCount || 0;
            const start = curExisting + 1;
            return {
              ...prev,
              isScanningToc: false,
              onlineToc: remote.chapterList || [],
              totalOnlineCount: totalOnline,
              startChapter: Math.min(start, totalOnline),
              endChapter: totalOnline
            };
          });
          toast(`Discovered ${totalOnline} chapters online! (Ready to fetch from Ch. ${(existingCount || 0) + 1})`, 'success');
        } catch (err) {
          console.error('Scan TOC error:', err);
          toast('Failed to scan online source: ' + err.message, 'error');
          setOngoingEpubModal(prev => prev ? { ...prev, isScanningToc: false } : null);
        }
      };

      const handleExecuteContinuation = async () => {
        if (!ongoingEpubModal || !ongoingEpubModal.sourceUrl) {
          return toast('Source URL is required to fetch new chapters.', 'warning');
        }
        const { title, author, cover, uuid, chapters, existingCount, sourceUrl, startChapter, endChapter, totalOnlineCount, file, originalZip } = ongoingEpubModal;

        const start = parseInt(startChapter, 10) || (existingCount + 1);
        const end = parseInt(endChapter, 10) || start;

        if (start > end) {
          return toast('Start chapter cannot be greater than end chapter.', 'warning');
        }

        setOngoingEpubModal(prev => prev ? {
          ...prev,
          isFetching: true,
          progress: { status: 'Connecting to online source…', pct: 5, elapsed: '0s' }
        } : null);

        try {
          const startTime = Date.now();
          const getElapsed = () => {
            const sec = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return (m > 0 ? `${m}m ` : '') + `${s}s`;
          };

          // 1. Fetch only the requested chapter range
          const remoteResult = await window.WebNovelImporter.importUrl(sourceUrl, (msg, pct) => {
            setOngoingEpubModal(prev => prev ? {
              ...prev,
              progress: { status: msg || 'Downloading new chapters…', pct: pct || 20, elapsed: getElapsed() }
            } : null);
          }, {
            chapterRange: { start, end }
          });

          const newFetchedChapters = remoteResult?.chapters || [];
          if (newFetchedChapters.length === 0) {
            throw new Error('No new chapters could be retrieved from the source.');
          }

          // 2. Merge original chapters with newly fetched chapters for library tracking
          const keepCount = Math.min(chapters.length, Math.max(0, start - 1));
          const originalKeep = chapters.slice(0, keepCount);
          const mergedChapters = [
            ...originalKeep.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content })),
            ...newFetchedChapters.map(c => ({ title: c.title, text: c.text || c.content, content: c.text || c.content }))
          ];

          // 3. Package EPUB: Use in-place continuation if original file/zip exists to preserve 100% of images and styling
          setOngoingEpubModal(prev => prev ? {
            ...prev,
            progress: { status: `Packaging chapters into EPUB…`, pct: 85, elapsed: getElapsed() }
          } : null);

          let epubBlob = null;
          const originalSource = file || originalZip;

          if (originalSource && window.appendChaptersToExistingEpub) {
            // True in-place continuation: keeps 100% of original photos, fonts, CSS styling, and chapters!
            epubBlob = await window.appendChaptersToExistingEpub(
              originalSource,
              newFetchedChapters,
              { startChapter: start },
              (status, pct) => {
                setOngoingEpubModal(prev => prev ? {
                  ...prev,
                  progress: { status, pct: Math.round(85 + (pct * 0.14)), elapsed: getElapsed() }
                } : null);
              }
            );
          } else {
            // Fallback if original binary EPUB file was not provided
            epubBlob = await generateEpubFromChapters(
              mergedChapters,
              title,
              author,
              'en',
              (status, pct, elapsed) => {
                setOngoingEpubModal(prev => prev ? {
                  ...prev,
                  progress: { status, pct: Math.round(85 + (pct * 0.14)), elapsed }
                } : null);
              },
              {
                uuid: uuid || undefined,
                coverUrl: cover || undefined,
                sourceUrl
              }
            );
          }

          // 4. Trigger download / save directly to designated folder
          const isInc = totalOnlineCount ? mergedChapters.length < totalOnlineCount : false;
          const fileName = getEpubFileName(title, mergedChapters.length, isInc);
          const folderOpts = ongoingEpubModal.folderOptions || getNovelFolderOptions({ id: uuid, title, sourceUrl });
          await saveUniversalBlob(epubBlob, fileName, 'application/epub+zip', false, folderOpts);

          // 5. Save updated novel into library with epubBlob cached for preserved re-downloads
          await saveNovelToHistory({
            title,
            author,
            cover,
            uuid: uuid || '',
            sourceUrl,
            chapters: mergedChapters,
            totalChapterCount: Math.max(mergedChapters.length, totalOnlineCount || mergedChapters.length),
            isIncomplete: isInc,
            isEpub: true,
            epubBlob,
            folderOptions: folderOpts,
            folderPath: folderOpts?.folderPath || '',
            folderTreeUri: folderOpts?.treeUri || ''
          });

          toast(`Updated "${title}"! Appended ${newFetchedChapters.length} new chapters. Book ID and styling preserved for Moon+ Reader Pro!`, 'success');
          setOngoingEpubModal(null);
        } catch (err) {
          console.error('Continuation error:', err);
          toast('Continuation failed: ' + err.message, 'error');
          setOngoingEpubModal(prev => prev ? { ...prev, isFetching: false } : null);
        }
      };

      // Load persistent IndexedDB novels on mount, merging seamlessly with localStorage
      useEffect(() => {
        (async () => {
          try {
            const combined = [];
            const seenIds = new Set();
            const seenTitles = new Set();

            if (window.GeminiNovelDB) {
              const dbNovels = await window.GeminiNovelDB.getAllNovels();
              if (dbNovels && dbNovels.length > 0) {
                dbNovels.reverse().forEach(n => {
                  const item = {
                    id: n.id,
                    title: n.title,
                    author: n.author,
                    summary: n.summary,
                    cover: n.cover || '',
                    tags: n.tags,
                    chapterCount: n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0),
                    totalChapterCount: n.totalChapterCount || (n.chapterList ? n.chapterList.length : (n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0))),
                    volumeCount: n.volumeCount || 0,
                    isIncomplete: !!n.isIncomplete,
                    isTranslated: !!n.isTranslated || (n.title || '').includes('(Translated)'),
                    inSavedSpace: !!n.inSavedSpace,
                    wordCount: n.wordCount,
                    timestamp: n.timestamp,
                    isEpub: n.isEpub,
                    sourceUrl: n.sourceUrl,
                    chapterList: n.chapterList || [],
                    folderTreeUri: n.folderTreeUri || '',
                    folderPath: n.folderPath || ''
                  };
                  if (!seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    if (item.title) seenTitles.add(item.title);
                    combined.push(item);
                  }
                });
              }
            }

            try {
              const metaStr = localStorage.getItem('gemini_web_import_history_meta') || localStorage.getItem('gemini_web_import_history');
              if (metaStr) {
                const localList = JSON.parse(metaStr);
                if (Array.isArray(localList)) {
                  localList.forEach(item => {
                    if (item && item.id) {
                      const existing = combined.find(c => c.id === item.id || (item.title && c.title && c.title.trim().toLowerCase() === item.title.trim().toLowerCase()));
                      if (existing) {
                        if (!existing.cover && item.cover) existing.cover = item.cover;
                        if (!existing.folderPath && item.folderPath) existing.folderPath = item.folderPath;
                        if (!existing.folderTreeUri && item.folderTreeUri) existing.folderTreeUri = item.folderTreeUri;
                        if (item.inSavedSpace) existing.inSavedSpace = true;
                      } else if (!seenIds.has(item.id) && !seenTitles.has(item.title)) {
                        seenIds.add(item.id);
                        if (item.title) seenTitles.add(item.title);
                        combined.push({ ...item, inSavedSpace: !!item.inSavedSpace });
                      }
                    }
                  });
                }
              }
            } catch(e) {}

            if (combined.length > 0) {
              setWebImportHistory(combined);
            }
            loadTrashCount();
          } catch (e) {
            console.warn('Novel history load error:', e);
          }
        })();
      }, []);

      // Lazy cover art hydration from IndexedDB for any novels missing covers
      useEffect(() => {
        if (!window.GeminiNovelDB) return;
        const missingCovers = (webImportHistory || []).filter(b => b && !b.cover && b.id);
        if (missingCovers.length === 0) return;

        let isMounted = true;
        (async () => {
          try {
            const updates = [];
            for (const b of missingCovers) {
              const full = await window.GeminiNovelDB.getNovel(b.id);
              if (full && full.cover) {
                updates.push({ id: b.id, cover: full.cover });
              }
            }
            if (updates.length > 0 && isMounted) {
              setWebImportHistory(prev => {
                const map = new Map(updates.map(u => [u.id, u.cover]));
                const next = (prev || []).map(item => map.has(item.id) ? { ...item, cover: map.get(item.id) } : item);
                try {
                  localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(next));
                } catch(e) {}
                return next;
              });
            }
          } catch(e) {
            console.warn('Cover hydration warning:', e);
          }
        })();
        return () => { isMounted = false; };
      }, [webImportHistory?.length]);

      const [studioSubTab, setStudioSubTab] = useState(() => localStorage.getItem('studioSubTab') || 'split');
      const [error, _setError] = useState('');

      // --- Translation State ---
      const [isTranslating, setIsTranslating] = useState(false);
      const [progress, setProgress] = useState(0);
      const [progressLabel, setProgressLabel] = useState('');
      const [translatedChapters, setTranslatedChapters] = useState([]);
      const [chapters, setChapters] = useState([]);
      const [lastUsageStats, setLastUsageStats] = useState(null);
      const [activeBookMenuNovel, setActiveBookMenuNovel] = useState(null);

      const partitionTextByChapters = (fullText, baseChapters) => {
        if (!fullText || !baseChapters || baseChapters.length <= 1) return null;
        const positions = [];
        for (let i = 0; i < baseChapters.length; i++) {
          const ch = baseChapters[i];
          const t = (ch.title || ch.originalTitle || '').trim();
          if (!t) return null;
          const regex = new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${t.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?:\\*\\*)?\\s*(?:\\n|$)`, 'i');
          const match = fullText.match(regex);
          if (!match || typeof match.index !== 'number') {
            const idx = fullText.indexOf(t);
            if (idx === -1) return null;
            positions.push({ idx, title: t, origCh: ch });
          } else {
            positions.push({ idx: match.index, title: t, origCh: ch });
          }
        }
        for (let i = 0; i < positions.length - 1; i++) {
          if (positions[i].idx >= positions[i + 1].idx) return null;
        }
        const result = [];
        for (let i = 0; i < positions.length; i++) {
          const start = positions[i].idx;
          const end = (i + 1 < positions.length) ? positions[i + 1].idx : fullText.length;
          let chText = fullText.substring(start, end).trim();
          const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
          const cleanContent = (typeof stripFn === 'function') ? stripFn(chText, positions[i].title, positions[i].origCh?.originalTitle) : chText;
          result.push({
            ...positions[i].origCh,
            title: positions[i].title,
            content: cleanContent,
            text: cleanContent
          });
        }
        return result;
      };

      const parseAssembledTextToChapters = (text, fallbackTitle = 'Chapter 1', knownTitles = []) => {
        if (!text || !text.trim()) return [];
        const lines = text.split(/\r?\n/);
        const cleanKnown = (knownTitles || []).map(t => String(t || '').replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim().toLowerCase()).filter(Boolean);
        const knownSet = new Set(cleanKnown);

        // Matches markdown headings (# Title), bold headings (**Chapter 1**), standard chapter patterns (Chapter 1, Ch. 2, Volume 1, Prologue, etc.), CJK patterns (第1章, 第一回), and numbered patterns (1. Title, 1 - Title, 1: Title)
        const headingRegex = /^(?:#{1,6}\s+(.+)$|\*\*(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc|第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]).+\*\*|(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc)\b\s*[\dIVXLCDM\s:.-].*|第[0-9零一二三四五六七八九十百千万]+[章回卷节篇].*|^(?:Chapter\s*)?\d+[\s:.-]+[A-Za-z\u4e00-\u9fa5].*)/i;
        const parts = [];
        let cur = null;
        for (const line of lines) {
          const trimmed = line.trim();
          const titleCandidate = trimmed.replace(/^#{1,6}\s+/, '').replace(/^\*\*|\*\*$/g, '').trim();
          const isKnown = titleCandidate && knownSet.has(titleCandidate.toLowerCase());
          const match = trimmed.match(headingRegex);
          if ((match || isKnown) && trimmed.length <= 150) {
            if (cur) parts.push({ title: cur.title, content: cur.content.trim() });
            const titleClean = titleCandidate || (match && match[1]) || trimmed;
            cur = { title: titleClean || fallbackTitle, content: '' };
          } else if (cur) {
            cur.content += line + '\n';
          } else {
            cur = { title: fallbackTitle, content: line + '\n' };
          }
        }
        if (cur) parts.push({ title: cur.title, content: cur.content.trim() });
        return parts;
      };

      const handleAssembledTextChange = (newText) => {
        setAssembledText(newText);
        const knownTitles = (translatedChapters || []).map(c => c?.title || c?.originalTitle).filter(Boolean);
        if (!translatedChapters || translatedChapters.length <= 1) {
          const defaultTitle = (translatedChapters && translatedChapters[0]?.title) || currentDocTitle || fileName || 'Chapter 1';
          const parsed = parseAssembledTextToChapters(newText, defaultTitle, knownTitles);
          if (parsed.length > 0) {
            setTranslatedChapters(parsed);
          } else {
            setTranslatedChapters([{ title: defaultTitle, content: newText }]);
          }
        } else {
          const parsed = parseAssembledTextToChapters(newText, translatedChapters[0]?.title || 'Chapter 1', knownTitles);
          if (parsed.length === translatedChapters.length) {
            // Keep original chapter metadata (index, stats, raw) but update titles and content with user's edits
            setTranslatedChapters(prev => prev.map((ch, i) => ({
              ...ch,
              title: parsed[i].title || ch.title,
              content: parsed[i].content || parsed[i].text || '',
              text: parsed[i].content || parsed[i].text || ''
            })));
          } else if (parsed.length > 1) {
            setTranslatedChapters(parsed);
          } else if (parsed.length === 1 && translatedChapters.length > 1) {
            const partitioned = partitionTextByChapters(newText, translatedChapters);
            if (partitioned && partitioned.length === translatedChapters.length) {
              setTranslatedChapters(partitioned);
            }
          }
          // If parsed.length <= 1 and cannot partition, do NOT overwrite chapter 0 with all chapters; keep translatedChapters intact
        }
      };

      // --- Provider State ---
      const [provider, setProvider] = useState(() => localStorage.getItem('translationProvider') || 'gemini');
      const [apiKeysByProvider, setApiKeysByProvider] = useState(() => {
        const saved = localStorage.getItem('apiKeysByProvider');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p && typeof p === 'object') return p;
          } catch (e) {}
        }
        const gKey = localStorage.getItem('geminiApiKey') || '';
        const dsKey = localStorage.getItem('deepseekApiKey') || '';
        const dlKey = localStorage.getItem('deeplApiKey') || '';
        const oaiKey = localStorage.getItem('openaiApiKey') || '';
        const cldKey = localStorage.getItem('claudeApiKey') || '';
        return {
          gemini: gKey ? [{ id: 'gemini-init', name: 'Primary Gemini Key', key: gKey }] : [],
          deepseek: dsKey ? [{ id: 'deepseek-init', name: 'Primary DeepSeek Key', key: dsKey }] : [],
          openai: oaiKey ? [{ id: 'openai-init', name: 'Primary OpenAI Key', key: oaiKey }] : [],
          claude: cldKey ? [{ id: 'claude-init', name: 'Primary Claude Key', key: cldKey }] : [],
          deepl: dlKey ? [{ id: 'deepl-init', name: 'Primary DeepL Key', key: dlKey }] : [],
          libre: []
        };
      });
      const [activeKeyIds, setActiveKeyIds] = useState(() => {
        const saved = localStorage.getItem('activeKeyIds');
        if (saved) {
          try {
            const p = JSON.parse(saved);
            if (p && typeof p === 'object') return p;
          } catch (e) {}
        }
        return {
          gemini: 'gemini-init',
          deepseek: 'deepseek-init',
          openai: 'openai-init',
          claude: 'claude-init',
          deepl: 'deepl-init',
          libre: null
        };
      });
      const [showKeys, setShowKeys] = useState({});

      const [libreUrl, setLibreUrl] = useState(() => localStorage.getItem('libreUrl') || 'https://libretranslate.com');
      const [geminiModel, setGeminiModel] = useState(() => {
        const saved = localStorage.getItem('geminiModel');
        if (saved && (saved.includes('gemini-2') || saved.includes('gemini-1'))) {
          localStorage.setItem('geminiModel', 'gemini-3.7-flash');
          return 'gemini-3.7-flash';
        }
        return saved || 'gemini-3.7-flash';
      });
      const [deepseekModel, setDeepseekModel] = useState(() => localStorage.getItem('deepseekModel') || 'deepseek-chat');
      const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('openaiModel') || 'gpt-4o-mini');
      const [claudeModel, setClaudeModel] = useState(() => localStorage.getItem('claudeModel') || 'claude-3-5-haiku-20241022');
      const [availableModels, setAvailableModels] = useState([]);
      const [customModel, setCustomModel] = useState(() => localStorage.getItem('customModel') || '');
      const [useCustomModel, setUseCustomModel] = useState(() => localStorage.getItem('useCustomModel') === 'true');
      const [customDeepseekModel, setCustomDeepseekModel] = useState(() => localStorage.getItem('customDeepseekModel') || '');
      const [useCustomDeepseekModel, setUseCustomDeepseekModel] = useState(() => localStorage.getItem('useCustomDeepseekModel') === 'true');
      const [customOpenaiModel, setCustomOpenaiModel] = useState('');
      const [useCustomOpenaiModel, setUseCustomOpenaiModel] = useState(false);
      const [customClaudeModel, setCustomClaudeModel] = useState('');
      const [useCustomClaudeModel, setUseCustomClaudeModel] = useState(false);
      const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
      const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);

      useEffect(() => {
        const handlePrompt = (e) => {
          e.preventDefault();
          globalDeferredPrompt = e;
          setDeferredPrompt(e);
        };
        const handleReady = () => {
          if (globalDeferredPrompt) setDeferredPrompt(globalDeferredPrompt);
        };
        window.addEventListener('beforeinstallprompt', handlePrompt);
        window.addEventListener('pwa-prompt-ready', handleReady);
        window.addEventListener('appinstalled', () => {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          toast('Gemini Translator installed successfully!', 'success');
        });
        return () => {
          window.removeEventListener('beforeinstallprompt', handlePrompt);
          window.removeEventListener('pwa-prompt-ready', handleReady);
        };
      }, []);

      useEffect(() => {
        const handleLoadExtractedText = (e) => {
          const { title, text, count } = e.detail || {};
          if (text) {
            setInputText(text);
            setActiveTab('text');
            toast(`Loaded ${count ? count + ' ' : ''}chapters from EPUB Studio into Translator!`, 'success');
          }
        };
        window.addEventListener('load-extracted-text', handleLoadExtractedText);
        return () => window.removeEventListener('load-extracted-text', handleLoadExtractedText);
      }, []);


      const handleInstallPWA = async () => {
        const promptEvent = deferredPrompt || globalDeferredPrompt;
        if (promptEvent) {
          promptEvent.prompt();
          try {
            const choice = await promptEvent.userChoice;
            if (choice && choice.outcome === 'accepted') {
              toast('Gemini Translator installed successfully!', 'success');
            }
          } catch (e) {}
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
        } else {
          alert(' How to install Gemini Translator on Samsung S24 / Microsoft Edge:\n\n1. Tap the "..." menu at the bottom.\n2. Look for "Install app" or tap "Add to phone" -> "Install app".\n (Make sure to select "Install app", NOT "Add shortcut")\n\n If you previously added a web shortcut, delete that shortcut from your home screen first, then reload this page.');
        }
      };

      // --- Multi-Key Profile Management Helpers ---
      const addApiKey = (prov) => {
        const id = genId();
        const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
        const provName = provNames[prov] || prov.toUpperCase();
        const newKey = { id, name: `${provName} Key ${(apiKeysByProvider[prov] || []).length + 1}`, key: '' };
        setApiKeysByProvider(prev => {
          const updated = { ...prev, [prov]: [...(prev[prov] || []), newKey] };
          localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
          return updated;
        });
        if (!activeKeyIds[prov]) {
          setActiveKeyIds(prev => {
            const updated = { ...prev, [prov]: id };
            localStorage.setItem('activeKeyIds', JSON.stringify(updated));
            return updated;
          });
        }
        toast(`Added new ${provName} key profile.`);
      };

      const deleteApiKey = (prov, id) => {
        confirmAction(`Delete this API key profile?`, () => {
          setApiKeysByProvider(prev => {
            const updated = { ...prev, [prov]: (prev[prov] || []).filter(k => k.id !== id) };
            localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
            return updated;
          });
          if (activeKeyIds[prov] === id) {
            setActiveKeyIds(prev => {
              const remaining = (apiKeysByProvider[prov] || []).filter(k => k.id !== id);
              const nextId = remaining.length > 0 ? remaining[0].id : null;
              const updated = { ...prev, [prov]: nextId };
              localStorage.setItem('activeKeyIds', JSON.stringify(updated));
              return updated;
            });
          }
          toast('Key profile deleted.', 'info');
        });
      };

      const updateApiKey = (prov, id, field, value) => {
        setApiKeysByProvider(prev => {
          const updated = {
            ...prev,
            [prov]: (prev[prov] || []).map(k => k.id === id ? { ...k, [field]: value } : k)
          };
          localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
          return updated;
        });
      };

      const setActiveKey = (prov, id) => {
        setActiveKeyIds(prev => {
          const updated = { ...prev, [prov]: id };
          localStorage.setItem('activeKeyIds', JSON.stringify(updated));
          return updated;
        });
        const kObj = (apiKeysByProvider[prov] || []).find(k => k.id === id);
        toast(`Active key set to "${kObj?.name || 'Selected Key'}"`);
      };

      const activeKeyIdsRef = useRef(activeKeyIds);
      useEffect(() => { activeKeyIdsRef.current = activeKeyIds; }, [activeKeyIds]);

      const rotateApiKey = (failingKey) => {
        const keys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
        if (keys.length <= 1) return null;
        
        let currentIdx = -1;
        if (failingKey) {
          currentIdx = keys.findIndex(k => k.key === failingKey);
        }
        if (currentIdx === -1) {
          let currentId = activeKeyIdsRef.current ? activeKeyIdsRef.current[provider] : null;
          if (!currentId) {
            try {
              const saved = JSON.parse(localStorage.getItem('activeKeyIds') || '{}');
              currentId = saved[provider];
            } catch(e) {}
          }
          currentIdx = Math.max(0, keys.findIndex(k => k.id === currentId));
        }

        const nextIdx = (currentIdx + 1) % keys.length;
        const nextKey = keys[nextIdx];

        activeKeyIdsRef.current = { ...(activeKeyIdsRef.current || {}), [provider]: nextKey.id };
        
        try {
          const saved = JSON.parse(localStorage.getItem('activeKeyIds') || '{}');
          saved[provider] = nextKey.id;
          localStorage.setItem('activeKeyIds', JSON.stringify(saved));
        } catch(e) {}

        setActiveKeyIds(prev => ({ ...prev, [provider]: nextKey.id }));

        if (!window._lastRotToast || Date.now() - window._lastRotToast > 2000) {
          window._lastRotToast = Date.now();
          toast(`Auto-rotated to "${nextKey.name}" (${nextIdx + 1}/${keys.length})`, 'info');
        }
        return nextKey.key;
      };
      if (typeof window !== 'undefined') window.rotateApiKey = rotateApiKey;

      const getActiveApiKey = (prov = provider) => {
        const keys = apiKeysByProvider[prov] || [];
        const activeId = activeKeyIds[prov];
        const found = keys.find(k => k.id === activeId);
        return found ? found.key : (keys[0] ? keys[0].key : '');
      };

      const geminiKey = getActiveApiKey('gemini');
      const deepseekKey = getActiveApiKey('deepseek');
      const openaiKey = getActiveApiKey('openai');
      const claudeKey = getActiveApiKey('claude');
      const deeplKey = getActiveApiKey('deepl');
      const [enableStreaming, setEnableStreaming] = useState(() => localStorage.getItem('enableStreaming') === 'true');
      const [enableThinking, setEnableThinking] = useState(() => localStorage.getItem('enableThinking') === 'true');
      const [strictModel, setStrictModel] = useState(() => localStorage.getItem('strictModel') !== 'false');
      const [concurrency, setConcurrency] = useState(() => parseInt(localStorage.getItem('concurrency')) || DEFAULT_CONCURRENCY);
      const [contextAware, setContextAware] = useState(() => localStorage.getItem('contextAware') !== 'false');
      const [chunkSizePreset, setChunkSizePreset] = useState(() => localStorage.getItem('chunkSizePreset') || 'turbo');

      // ── EPUB Formatting & Typography Preferences ──
      const [epubDropCaps, setEpubDropCaps] = useState(() => localStorage.getItem('epubDropCaps') !== 'false');
      const [epubSmartQuotes, setEpubSmartQuotes] = useState(() => localStorage.getItem('epubSmartQuotes') !== 'false');
      const [epubCleanWebArtifacts, setEpubCleanWebArtifacts] = useState(() => localStorage.getItem('epubCleanWebArtifacts') !== 'false');
      const [epubFontTheme, setEpubFontTheme] = useState(() => localStorage.getItem('epubFontTheme') || 'literata');
      const [epubJustifyText, setEpubJustifyText] = useState(() => localStorage.getItem('epubJustifyText') !== 'false');
      const [epubIncludeImages, setEpubIncludeImages] = useState(() => localStorage.getItem('epubIncludeImages') !== 'false');
      const [epubFixedFilename, setEpubFixedFilename] = useState(() => localStorage.getItem('epubFixedFilename') !== 'false');
      const [scrapeImages, setScrapeImages] = useState(() => localStorage.getItem('scrapeImages') !== 'false');

      useEffect(() => { localStorage.setItem('strictModel', String(strictModel)); }, [strictModel]);
      useEffect(() => { localStorage.setItem('epubIncludeImages', String(epubIncludeImages)); }, [epubIncludeImages]);
      useEffect(() => { localStorage.setItem('epubFixedFilename', String(epubFixedFilename)); }, [epubFixedFilename]);
      useEffect(() => { localStorage.setItem('scrapeImages', String(scrapeImages)); if (typeof window !== 'undefined') window.__scrapeImages = scrapeImages; }, [scrapeImages]);

      useEffect(() => { localStorage.setItem('epubDropCaps', String(epubDropCaps)); }, [epubDropCaps]);
      useEffect(() => { localStorage.setItem('epubSmartQuotes', String(epubSmartQuotes)); }, [epubSmartQuotes]);
      useEffect(() => { localStorage.setItem('epubCleanWebArtifacts', String(epubCleanWebArtifacts)); }, [epubCleanWebArtifacts]);
      useEffect(() => { localStorage.setItem('epubFontTheme', epubFontTheme); }, [epubFontTheme]);
      useEffect(() => { localStorage.setItem('epubJustifyText', String(epubJustifyText)); }, [epubJustifyText]);

      const getEpubOptions = (extraOpts = {}) => {
        const activeNovel = (typeof activeNovelView !== 'undefined' && activeNovelView) ? activeNovelView : ((activeCrawlSession?.chapters?.length >= (webImportData?.chapters?.length || 0)) ? activeCrawlSession : (webImportData || activeCrawlSession));
        let coverCandidate = (extraOpts && (extraOpts.coverUrl || extraOpts.cover)) || (typeof currentDocCover !== 'undefined' && currentDocCover) || activeNovel?.cover || (typeof activeCrawlSession !== 'undefined' ? activeCrawlSession?.cover : '') || (typeof activeNovelRecord !== 'undefined' ? activeNovelRecord?.cover : '') || (typeof coverImage !== 'undefined' ? coverImage : '') || '';

        if (!coverCandidate && typeof window !== 'undefined' && window.currentDocCover) {
          coverCandidate = window.currentDocCover;
        }
        if (!coverCandidate && typeof localStorage !== 'undefined') {
          coverCandidate = localStorage.getItem('gemini_current_doc_cover') || '';
        }
        if (!coverCandidate && typeof webImportHistory !== 'undefined' && Array.isArray(webImportHistory)) {
          const searchTitle = extraOpts?.novelId || extraOpts?.title || (typeof fileName !== 'undefined' ? fileName : '') || (typeof currentDocTitle !== 'undefined' ? currentDocTitle : '');
          if (searchTitle) {
            const cleanST = String(searchTitle).replace(/\.[^/.]+$/, '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
            const matchedMeta = webImportHistory.find(n => {
              const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
              return nt && (nt === cleanST || cleanST.includes(nt) || nt.includes(cleanST)) && n.cover;
            });
            if (matchedMeta?.cover) coverCandidate = matchedMeta.cover;
          }
        }

        const cleanExtra = { ...extraOpts };
        if (!cleanExtra.coverUrl) delete cleanExtra.coverUrl;
        if (!cleanExtra.cover) delete cleanExtra.cover;

        return {
          includeImages: (epubIncludeImages !== false) && (scrapeImages !== false),
          dropCaps: epubDropCaps,
          smartQuotes: epubSmartQuotes,
          cleanWebArtifacts: epubCleanWebArtifacts,
          fontTheme: epubFontTheme,
          justifyText: epubJustifyText,
          fixedFilename: epubFixedFilename !== false,
          ...cleanExtra,
          coverUrl: cleanExtra.coverUrl || coverCandidate
        };
      };

      const getEpubFileName = (title, chapterCount = 0, isPartial = false) => {
        const cleanName = (typeof sanitizeFilename === 'function' ? sanitizeFilename(title) : String(title || 'Novel')).replace(/\s+/g, ' ').trim();
        if (epubFixedFilename !== false || !isPartial) {
          return `${cleanName}.epub`;
        }
        return `${cleanName} (Ch1-${chapterCount}).epub`;
      };

      const cleanBookTitle = (t, fallbackChs = []) => {
        let s = String(t || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        if (!s || s === 'Web Novel' || s === 'Lnori Series' || s === 'Lnori Book' || s === 'Novel') {
          const firstCh = fallbackChs?.[0]?.title || '';
          const m = firstCh.match(/^(?:Volume\s*\d+\s*[-–:]\s*)?([^–—:\n]+)/i);
          if (m && m[1] && m[1].length > 2 && !/^(cover|part|chapter)/i.test(m[1].trim())) {
            s = m[1].trim();
          }
        }
        return s || 'Web Novel';
      };

      const cleanBookAuthor = (a) => {
        let s = String(a || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        if (!s || s === 'Author' || s === 'Unknown' || s === 'Lnori Author') return 'Author';
        return s;
      };

      // ══════════════════════════════════════════════════════════════════
      // STAGE 2: MOON+ READER PRO FOLDER BINDING & LOCAL OPDS SERVER
      // ══════════════════════════════════════════════════════════════════
      const [opdsRunning, setOpdsRunning] = useState(false);
      const [opdsUrl, setOpdsUrl] = useState('http://127.0.0.1:8080/opds');
      const [opdsWifiUrl, setOpdsWifiUrl] = useState('');

      useEffect(() => {
        if (window.NativeBridge && window.NativeBridge.getOpdsStatus) {
          window.NativeBridge.getOpdsStatus().then(status => {
            if (status) {
              setOpdsRunning(!!status.running);
              if (status.localUrl) setOpdsUrl(status.localUrl);
              if (status.wifiUrl) setOpdsWifiUrl(status.wifiUrl);
            }
          }).catch(() => {});
        }
      }, []);

      const updateNovelFolderRecord = async (novel, treeUri, displayPath) => {
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
          } catch(e) {}
        }

        // 4. Update webImportHistory state
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
          if (typeof novel === 'object' && novel) {
            return [{ ...novel, folderTreeUri: treeUri, folderPath: displayPath }, ...list];
          }
          return list;
        });

        // 5. Update activeCrawlSession state and localStorage if currently active
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

        // 6. Update webImportData state
        setWebImportData(prev => {
          if (!prev) return prev;
          const matchId = novelId && prev.id === novelId;
          const matchTitle = normTitle && (prev.title || '').trim().toLowerCase() === normTitle;
          if (matchId || matchTitle || !novelId) {
            return { ...prev, folderTreeUri: treeUri, folderPath: displayPath };
          }
          return prev;
        });

        // 7. Update activeNovelRecord state if present
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
      };

      const handleSetNovelFolder = async (novel) => {
        if (!novel) return;
        try {
          if (window.NativeBridge && window.NativeBridge.chooseFolder) {
            const res = await window.NativeBridge.chooseFolder();
            if (res && res.treeUri) {
              await updateNovelFolderRecord(novel, res.treeUri, res.displayPath);
              toast(`📁 Bound "${novel.title}" to ${res.displayPath}! Future EPUBs will overwrite here.`, 'success');
            }
          } else {
            const cur = novel.folderPath || ('Books/' + (typeof sanitizeFilename === 'function' ? sanitizeFilename(novel.title) : novel.title));
            const p = window.prompt('Enter folder path for "' + novel.title + '" (e.g. Books/' + (typeof sanitizeFilename === 'function' ? sanitizeFilename(novel.title) : novel.title) + '):', cur);
            if (p !== null && p.trim()) {
              await updateNovelFolderRecord(novel, '', p.trim());
              toast(`📁 Saved folder path for "${novel.title}"!`, 'success');
            }
          }
        } catch (e) {
          if (e.message && !e.message.toLowerCase().includes('cancel')) {
            toast('Folder setup: ' + e.message, 'error');
          }
        }
      };

      const generateOpdsFeedXml = (novels) => {
        const escapeXmlStr = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const now = new Date().toISOString();
        let entries = '';
        (novels || []).forEach(n => {
          const cleanTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(n.title) : (n.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const cleanAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(n.author) : (n.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const epubFileName = getEpubFileName(cleanTitle, n.chapterCount || (n.chapters || []).length, false);
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
      };

      const syncOpdsCatalogToNative = useCallback((novelsList) => {
        try {
          if (window.NativeBridge && window.NativeBridge.updateOpdsCatalog) {
            const xml = generateOpdsFeedXml(novelsList || webImportHistory);
            window.NativeBridge.updateOpdsCatalog(xml);
          }
        } catch(e) {}
      }, [webImportHistory]);

      useEffect(() => {
        if (webImportHistory && webImportHistory.length > 0) {
          syncOpdsCatalogToNative(webImportHistory);
        }
      }, [webImportHistory, syncOpdsCatalogToNative]);

      const toggleOpdsServer = async () => {
        try {
          if (opdsRunning) {
            await window.NativeBridge?.stopOpdsServer?.();
            setOpdsRunning(false);
            toast('Moon+ Reader OPDS Feed stopped.', 'info');
          } else {
            syncOpdsCatalogToNative(webImportHistory);
            const res = await window.NativeBridge?.startOpdsServer?.(8080);
            if (res && res.running) {
              setOpdsRunning(true);
              if (res.localUrl) setOpdsUrl(res.localUrl);
              if (res.wifiUrl) setOpdsWifiUrl(res.wifiUrl);
              toast('Moon+ Reader OPDS Feed online! 📡 (' + (res.localUrl || 'port 8080') + ')', 'success');
            } else {
              toast('Could not start OPDS server on device.', 'warning');
            }
          }
        } catch (e) {
          toast('OPDS Error: ' + e.message, 'error');
        }
      };

      // ── SWIFTAUDIO HANDLERS ──
      const handleSwiftAudioSearch = async (queryOrUrl) => {
        const target = (queryOrUrl || webImportUrl || '').trim();
        if (!target || target === 'https://swiftaudiobooks.com/' || target === 'https://swiftaudiobooks.com') {
          return toast('Please enter an audiobook title to search (e.g. Shadow Slave, Harry Potter)', 'warning');
        }
        if (!window.SwiftAudioEngine || !window.SwiftAudioEngine.Scraper) {
          return toast('Audio engine is initializing, please try again in a moment…', 'info');
        }

        setIsSwiftAudioSearching(true);
        setWebImportStatus('Searching SwiftAudiobooks…');
        try {
          const isBookUrl = /^https?:\/\/(?:www\.)?(?:swiftaudiobooks\.com|ipaudio7\.com)\/[a-z0-9-]+/i.test(target) &&
            !/https?:\/\/(?:www\.)?swiftaudiobooks\.com\/?$/i.test(target) &&
            !target.includes('/?s=');

          if (isBookUrl) {
            toast('Fetching audiobook tracks…', 'info');
            const book = await window.SwiftAudioEngine.Scraper.getBookDetails(target);
            setActiveAudiobook(book);
            setSwiftAudioResults([book]);
            toast(`Loaded "${book.title}" (${book.totalTracks} chapters)!`, 'success');
          } else {
            const q = target.replace(/^https?:\/\/swiftaudiobooks\.com\/\?s=/i, '').replace(/^https?:\/\/[^\/]+\/?/i, '');
            const results = await window.SwiftAudioEngine.Scraper.search(q || target);
            setSwiftAudioResults(results);
            if (results.length === 0) {
              toast('No audiobooks found matching query.', 'info');
            } else {
              toast(`Found ${results.length} audiobooks on SwiftAudiobooks!`, 'success');
            }
          }
        } catch (e) {
          toast('SwiftAudio error: ' + e.message, 'error');
        } finally {
          setIsSwiftAudioSearching(false);
          setWebImportStatus('');
        }
      };

      // ── NOVEL SEARCH HANDLER ──
      const handleSearchNovels = async (queryOrUrl, sourceOverride = 'all') => {
        const target = (queryOrUrl || webImportUrl || '').trim();
        if (!target || target === 'https://novelbuddy.me' || target === 'https://www.royalroad.com' || target === 'https://novelfire.net' || target === 'https://lnori.com/' || target === 'https://lnori.com' || target === 'https://witchculttranslation.com/table-of-content/') {
          return toast('Please enter a novel title or keyword to search (e.g. Horror Game Developer, Shadow Slave, Re:Zero)', 'warning');
        }

        // If user pasted a direct novel chapter or book URL, initiate crawl directly
        if (/^https?:\/\//i.test(target) && !target.includes('/search') && !target.includes('?q=') && !target.includes('?s=')) {
          toast('Direct novel URL detected. Starting novel fetch…', 'info');
          return handleStartFetch(false, null, false, target);
        }

        if (sourceOverride === 'all') {
          setNovelSearchFilter('all');
        }

        setIsSearchingNovels(true);
        setIsSearchResultsCollapsed(false);
        setWebImportStatus('Searching novel sources and installed plugins…');
        try {
          const q = target.replace(/^https?:\/\/[^\/]+\/(?:search|fictions\/search)\?[^=]+=/i, '');
          let results = [];
          if (window.WebNovelImporter?.searchNovels && sourceOverride !== 'plugins_only') {
            try {
              results = await window.WebNovelImporter.searchNovels(q || target, sourceOverride || 'all');
            } catch (sErr) {
              console.warn('[searchNovels] Scraper search error:', sErr);
            }
          }

          // Search active community & built-in source plugins via SourceRegistry
          const reg = window.sourceRegistry || window.SourceRegistry;
          if (reg) {
            try {
              let pluginResults = [];
              const normOverride = (sourceOverride || 'all').replace(/[\s\-_]+/g, '').toLowerCase();
              if (normOverride !== 'all' && normOverride !== 'plugins' && normOverride !== 'plugins_only') {
                if (typeof reg.searchPlugin === 'function') {
                  pluginResults = await reg.searchPlugin(sourceOverride, q || target);
                }
              } else {
                pluginResults = await reg.searchAll(q || target);
              }
              if (Array.isArray(pluginResults) && pluginResults.length > 0) {
                const existingUrls = new Set((results || []).map(r => (r.url || '').replace(/\/$/, '')));
                for (const p of pluginResults) {
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
            } catch (pErr) {
              console.warn('[handleSearchNovels] Plugin search failed:', pErr);
            }
          }

          // If a specific source was requested but yielded 0 results, fall back to searching all sources
          if ((!results || results.length === 0) && sourceOverride !== 'all' && sourceOverride !== 'plugins_only') {
            try {
              if (window.WebNovelImporter?.searchNovels) {
                const fallbackResults = await window.WebNovelImporter.searchNovels(q || target, 'all');
                if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
                  results = fallbackResults;
                  setNovelSearchFilter('all');
                  toast(`No results on ${sourceOverride}, but found ${results.length} across other sources!`, 'info');
                }
              }
            } catch (_) {}
          }

          setNovelSearchResults(results || []);
          if (!results || results.length === 0) {
            toast(`No novels found matching "${target}". Try different keywords or browse 278+ Source Plugins!`, 'info');
          } else {
            toast(`Found ${results.length} novels across supported sources & plugins!`, 'success');
          }
        } catch (e) {
          toast('Novel search error: ' + (e?.message || e), 'error');
        } finally {
          setIsSearchingNovels(false);
          setWebImportStatus('');
        }
      };

      const handleStartPlayAudiobook = async (bookOrResult, startTrack = 0) => {
        try {
          const targetUrl = bookOrResult?.url || (typeof bookOrResult === 'string' ? bookOrResult : webImportUrl || '').trim();
          if (!targetUrl || targetUrl === 'https://swiftaudiobooks.com/' || targetUrl === 'https://swiftaudiobooks.com') {
            return toast('Please enter an audiobook title to search (e.g. Shadow Slave) or select a book.', 'warning');
          }
          if (!window.SwiftAudioEngine || !window.SwiftAudioEngine.Scraper || !window.SwiftAudioEngine.Player) {
            return toast('Audio engine is initializing, please try again in a moment…', 'info');
          }

          // If the book is already loaded in the player, resume or switch track
          const player = window.SwiftAudioEngine.Player;
          if (player.currentBook && player.currentBook.url === targetUrl) {
            if (startTrack !== undefined && startTrack !== player.currentTrackIndex) {
              player.playTrack(startTrack);
            } else if (!player.isPlaying) {
              player.play();
            }
            setIsFullPlayerOpen(true);
            return;
          }

          let fullBook = bookOrResult;
          if (!fullBook || !fullBook.tracks || fullBook.tracks.length === 0) {
            toast('Loading chapter audio streams…', 'info');
            fullBook = await window.SwiftAudioEngine.Scraper.getBookDetails(targetUrl);
          }
          setActiveAudiobook(fullBook);
          window.SwiftAudioEngine.Player.loadBook(fullBook, startTrack, true);
          setIsFullPlayerOpen(true);
          toast(`Playing: ${fullBook.title}`, 'success');
        } catch (e) {
          toast('Could not play audiobook: ' + e.message, 'error');
        }
      };

      const handleOpenAudioDownload = async (bookOrResult) => {
        try {
          const targetUrl = bookOrResult?.url || (typeof bookOrResult === 'string' ? bookOrResult : webImportUrl || '').trim();
          if (!targetUrl || targetUrl === 'https://swiftaudiobooks.com/' || targetUrl === 'https://swiftaudiobooks.com') {
            return toast('Please enter an audiobook title to search (e.g. Shadow Slave) or select a book.', 'warning');
          }
          if (!window.SwiftAudioEngine || !window.SwiftAudioEngine.Scraper) {
            return toast('Audio engine is initializing, please try again in a moment…', 'info');
          }
          let fullBook = bookOrResult;
          if (!fullBook || !fullBook.tracks || fullBook.tracks.length === 0) {
            toast('Loading chapter audio streams…', 'info');
            fullBook = await window.SwiftAudioEngine.Scraper.getBookDetails(targetUrl);
          }
          setActiveAudiobook(fullBook);
          const opts = getNovelFolderOptions(fullBook);
          const allIndices = (fullBook.tracks || []).map((_, i) => i);
          setAudioDownloadModal({
            book: fullBook,
            folderOptions: opts,
            selectedIndices: allIndices,
            status: `Ready to download ${fullBook.tracks.length} chapters`,
            percent: 0,
            active: false,
            isMinimized: false
          });
        } catch (e) {
          toast('Could not load audiobook for download: ' + e.message, 'error');
        }
      };

      const handleExecuteAudioBatchDownload = async () => {
        if (!audioDownloadModal || !audioDownloadModal.book) return;
        const book = audioDownloadModal.book;
        const opts = audioDownloadModal.folderOptions || getNovelFolderOptions(book);
        const selected = audioDownloadModal.selectedIndices || (book.tracks || []).map((_, i) => i);
        if (selected.length === 0) {
          return toast('Please select at least one chapter to download.', 'warning');
        }

        setAudioDownloadModal(prev => ({ ...prev, active: true, status: `Starting download (${selected.length} ch)…`, percent: 0 }));

        try {
          const res = await window.SwiftAudioEngine.Downloader.downloadAllTracks(book, opts, (progress) => {
            setAudioDownloadModal(prev => prev ? ({
              ...prev,
              status: progress.status,
              percent: progress.percent,
              completed: progress.completed
            }) : prev);
          }, selected);
          setAudioDownloadModal(prev => prev ? ({
            ...prev,
            active: false,
            status: res && res.count ? `Complete! Downloaded ${res.count} chapter(s).` : 'Download completed.',
            percent: 100
          }) : null);
          toast(`Chapters of "${book.title}" downloaded!`, 'success');
        } catch (e) {
          toast('Audiobook download error: ' + e.message, 'error');
          setAudioDownloadModal(prev => prev ? ({ ...prev, active: false, status: 'Download failed: ' + e.message }) : null);
        }
      };

      // --- Language State ---
      const [srcLang, setSrcLang] = useState('Auto-detect');
      const [tgtLang, setTgtLang] = useState('English');

      // --- Glossary State ---
      const [savedGlossaries, setSavedGlossaries] = useState(() => {
        try { return JSON.parse(localStorage.getItem('savedGlossaries') || '[]'); } catch (e) { return []; }
      });
      const [newGlossaryName, setNewGlossaryName] = useState('');
      const [activeGlossaryId, setActiveGlossaryId] = useState(() => localStorage.getItem('activeGlossaryId') || null);
      const [defaultGlossaryName, setDefaultGlossaryName] = useState(() => localStorage.getItem('defaultGlossaryName') || null);

      // --- Reader Mode State ---
      const [readerOpen, setReaderOpen] = useState(false);
      const [readerTheme, setReaderTheme] = useState(() => localStorage.getItem('readerTheme') || 'sepia');
      const [readerFont, setReaderFont] = useState(() => localStorage.getItem('readerFont') || 'serif');
      const [readerFontSize, setReaderFontSize] = useState(() => parseInt(localStorage.getItem('readerFontSize')) || 18);
      const [readerChapterIdx, setReaderChapterIdx] = useState(0);
      const [readerNovelId, setReaderNovelId] = useState(null);
      const [readerNovelTitle, setReaderNovelTitle] = useState(null);

      // --- Session/Resume State ---
      const [activeSession, setActiveSession] = useState(null);
      const activeSessionRef = useRef(null);
      useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
      const [savedTranslationSession, setSavedTranslationSession] = useState(null);
      const [isTranslationPaused, setIsTranslationPaused] = useState(false);
      const isPausingRef = useRef(false);
      const [currentFileHash, setCurrentFileHash] = useState('');
      const [currentOriginalZip, setCurrentOriginalZip] = useState(null);
      const [currentIsEpub, setCurrentIsEpub] = useState(false);
      const [currentDocCover, setCurrentDocCover] = useState(() => {
        try { return localStorage.getItem('gemini_current_doc_cover') || ''; } catch (_) { return ''; }
      });
      useEffect(() => {
        try {
          if (currentDocCover) {
            localStorage.setItem('gemini_current_doc_cover', currentDocCover);
            window.currentDocCover = currentDocCover;
          }
        } catch (_) {}
      }, [currentDocCover]);
      const [fileName, setFileName] = useState('');
      const [currentDocTitle, setCurrentDocTitle] = useState('');

      // Check for active / paused translation in IndexedDB on launch
      useEffect(() => {
        (async () => {
          if (window.GeminiNovelDB) {
            try {
              const active = await window.GeminiNovelDB.getActiveTranslationSession();
              if (active) {
                activeSessionRef.current = active;
                setActiveSession(active);
                setSavedTranslationSession(active);
                setIsTranslationPaused(true);
              }
            } catch(e) {}
          }
        })();
      }, []);

      // Translator Input Performance Debouncer
      const inputSaveTimerRef = useRef(null);
      const handleInputChange = (val) => {
        setInputText(val);
        if (chapters.length > 0) {
          if (!val.trim()) {
            setChapters([]);
          } else if (chapters.length === 1) {
            setChapters([{ ...chapters[0], text: val, content: val }]);
          }
        }
        if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
        inputSaveTimerRef.current = setTimeout(() => {
          try {
            if (val.length < 500000) {
              localStorage.setItem('inputText', val);
            } else {
              localStorage.removeItem('inputText');
            }
          } catch (e) {}
        }, 800);
      };

      // Memoized Performance Metrics
      const inputCharCount = useMemo(() => charCount(inputText), [inputText]);
      const inputTokenCount = useMemo(() => estimateTokens(inputText), [inputText]);
      const outputWordCount = useMemo(() => wordCount(assembledText), [assembledText]);

      const handlePauseTranslation = async () => {
        isPausingRef.current = true;
        setIsTranslationPaused(true);
        if (abortRef.current) {
          try { abortRef.current.abort(); } catch(e) {}
        }
        let session = activeSessionRef.current || activeSession;
        if (!session && window.GeminiNovelDB) {
          try {
            session = await window.GeminiNovelDB.getActiveTranslationSession();
          } catch(e) {}
        }
        // Fallback: If still no session, synthesize one from current state so Resume is GUARANTEED to exist
        if (!session) {
          if (chapters && chapters.length > 0) {
            const bTitle = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || (chapters[0] && chapters[0].title) || 'Web Novel';
            const jId = currentFileHash || ('job_' + String(bTitle).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + chapters.length);
            const compCount = (translatedChapters || []).filter(c => c && (c.content || c.text)).length;
            session = {
              id: jId,
              type: 'ebook',
              title: bTitle,
              ctx: '',
              completedCount: compCount,
              currentChapterIdx: compCount,
              currentChunkIdx: 0,
              allParts: (translatedChapters || []).map(c => c ? `${c.title || ''}\n\n${c.content || c.text || ''}` : ''),
              newChapters: translatedChapters || [],
              totalChunks: chapters.length,
              chapters: (chapters || []).map((c, i) => ({ title: c?.title || `Chapter ${i + 1}`, text: c?.text || c?.content || '' })),
              isEpub: currentIsEpub,
              cover: currentDocCover || activeNovelRecord?.cover || '',
              novelRecord: activeNovelRecord || null,
              timestamp: Date.now()
            };
          } else if (inputText.trim()) {
            const jId = generateJobId(inputText);
            session = {
              id: jId,
              type: 'text',
              title: 'Text Translation',
              result: assembledText,
              ctx: '',
              completedCount: assembledText ? 1 : 0,
              total: 1,
              cover: currentDocCover || activeNovelRecord?.cover || '',
              novelRecord: activeNovelRecord || null,
              timestamp: Date.now()
            };
          }
        }
        if (session) {
          if (!session.cover && (currentDocCover || activeNovelRecord?.cover)) {
            session.cover = currentDocCover || activeNovelRecord?.cover || '';
          }
          if (!session.novelRecord && activeNovelRecord) {
            session.novelRecord = activeNovelRecord;
          }
          activeSessionRef.current = session;
          setActiveSession(session);
          setSavedTranslationSession(session);
          if (window.GeminiNovelDB) {
            window.GeminiNovelDB.saveTranslationSession(session).catch(() => {});
          }
        }
        window.NativeBridge?.clearProgressNotification?.(false);
        window.NativeBridge?.showCompletionNotification?.('Translation Paused ⏸', 'Translation paused. Progress safely saved.');
        toast('Translation paused. All progress safely saved to database.', 'info');
      };

      const resumeSavedTranslation = async (session) => {
        const s = session || savedTranslationSession || activeSessionRef.current || activeSession;
        if (!s) {
          toast('No saved translation session found.', 'warning');
          return;
        }
        toast(`Resuming translation (${s.completedCount || 0} done)...`, 'info');
        activeSessionRef.current = s;
        setActiveSession(s);
        setSavedTranslationSession(s);
        setIsTranslationPaused(false);
        isPausingRef.current = false;
        if (s.cover) setCurrentDocCover(s.cover);
        if (s.novelRecord) setActiveNovelRecord(s.novelRecord);
        if (s.title) {
          setFileName(s.title);
          setCurrentDocTitle(s.title);
        }
        setActiveTab('text');
        if (s.type === 'ebook') {
          if (s.newChapters && s.newChapters.length > 0) {
            setTranslatedChapters(s.newChapters);
          }
          if (s.allParts && s.allParts.length > 0) {
            setAssembledText(s.allParts.filter(Boolean).join('\n\n\n').trim());
          }
          const chs = (chapters && chapters.length > 0) ? chapters : (s.chapters || []);
          handleTranslateEbook(chs, true, s.isEpub);
        } else {
          if (s.result) setAssembledText(s.result);
          handleTranslateText(true);
        }
      };

      const discardSavedTranslation = async (sessionId) => {
        if (window.GeminiNovelDB && sessionId) {
          await window.GeminiNovelDB.deleteTranslationSession(sessionId);
        }
        if (sessionId) {
          try { localStorage.removeItem(sessionId); } catch(e) {}
        }
        activeSessionRef.current = null;
        setSavedTranslationSession(null);
        setActiveSession(null);
        setIsTranslationPaused(false);
        toast('Discarded saved translation session.', 'info');
      };

      const handleSaveTranslationToLibrarySpace = async () => {
        if (!assembledText.trim()) {
          toast('No translated text to save.', 'warning');
          return;
        }
        const title = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || (translatedChapters && translatedChapters[0]?.title && !isGenericTitle(translatedChapters[0].title) ? translatedChapters[0].title : 'Translated Document');
        const exportChs = (typeof parseAssembledTextToChapters === 'function' && assembledText.trim())
          ? parseAssembledTextToChapters(assembledText, title)
          : [];
        const chs = (exportChs.length > 0)
          ? exportChs.map((c, i) => ({
              idx: i,
              title: c?.title || `Chapter ${i + 1}`,
              text: c?.content || c?.text || '',
              content: c?.content || c?.text || '',
              words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
            }))
          : (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters.filter(Boolean).map((c, i) => ({
              idx: i,
              title: c?.title || `Chapter ${i + 1}`,
              text: c?.content || c?.text || '',
              content: c?.content || c?.text || '',
              words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
            }))
          : [{
              idx: 0,
              title: title,
              text: assembledText,
              content: assembledText,
              words: assembledText.split(/\s+/).filter(Boolean).length
            }];
        const origChs = (chapters && chapters.length > 0)
          ? chapters.filter(Boolean).map((c, i) => ({
              idx: i,
              title: c?.title || `Chapter ${i + 1}`,
              text: c?.content || c?.text || '',
              content: c?.content || c?.text || '',
              words: (c?.content || c?.text || '').split(/\s+/).filter(Boolean).length
            }))
          : (inputText.trim() ? [{
              idx: 0,
              title: title,
              text: inputText,
              content: inputText,
              words: inputText.split(/\s+/).filter(Boolean).length
            }] : []);

        const saveTitle = title.includes('(Translated)') ? title : `${title} (Translated)`;
        const cleanT = (t) => String(t || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
        const baseTitle = cleanT(title);
        const matchingOriginal = (webImportHistory || []).find(n => n && cleanT(n.title) === baseTitle);
        const resolvedCover = currentDocCover || activeNovelRecord?.cover || webImportData?.cover || matchingOriginal?.cover || '';
        const resolvedAuthor = activeNovelRecord?.author || webImportData?.author || matchingOriginal?.author || 'Author';
        const resolvedSourceUrl = (activeNovelRecord && (activeNovelRecord.sourceUrl || activeNovelRecord.url)) ||
                                  (webImportData && (webImportData.sourceUrl || webImportData.url)) ||
                                  (typeof webImportUrl !== 'undefined' && webImportUrl ? webImportUrl : '') ||
                                  (matchingOriginal && (matchingOriginal.sourceUrl || matchingOriginal.url)) || '';

        await saveNovelToHistory({
          title: saveTitle,
          author: resolvedAuthor,
          cover: resolvedCover,
          sourceUrl: resolvedSourceUrl,
          chapters: chs,
          rawChapters: chs,
          originalChapters: origChs,
          chapterCount: chs.length,
          totalChapterCount: chs.length,
          isTranslated: true,
          inSavedSpace: true,
          isIncomplete: false
        });
        toast(`"${saveTitle}" saved to your Saved Space! ⭐`, 'success');
      };

      // --- UI State ---
      const [darkMode, setDarkMode] = useState(() => { const s = localStorage.getItem('darkMode'); return s !== null ? s === 'true' : window.matchMedia('(prefers-color-scheme:dark)').matches });
      const [amoledMode, setAmoledMode] = useState(() => localStorage.getItem('amoledMode') === 'true');
      useEffect(() => {
        localStorage.setItem('amoledMode', String(amoledMode));
        if (amoledMode) {
          document.documentElement.setAttribute('data-theme', 'amoled');
          document.body.classList.add('theme-amoled');
        } else {
          document.documentElement.removeAttribute('data-theme');
          document.body.classList.remove('theme-amoled');
        }
      }, [amoledMode]);

      // Android / Device WakeLock Setting
      const [deviceWakeLock, setDeviceWakeLock] = useState(() => localStorage.getItem('deviceWakeLock') !== 'false');
      useEffect(() => { localStorage.setItem('deviceWakeLock', String(deviceWakeLock)); }, [deviceWakeLock]);

      // WebDAV Sync State
      const [webdavUrl, setWebdavUrl] = useState(() => localStorage.getItem('webdavUrl') || '');
      const [webdavUser, setWebdavUser] = useState(() => localStorage.getItem('webdavUser') || '');
      const [webdavPass, setWebdavPass] = useState(() => localStorage.getItem('webdavPass') || '');
      const [webdavPath, setWebdavPath] = useState(() => localStorage.getItem('webdavPath') || 'GeminiTranslator');
      const [webdavAutoSync, setWebdavAutoSync] = useState(() => localStorage.getItem('webdavAutoSync') === 'true');
      const [webdavTesting, setWebdavTesting] = useState(false);
      const [webdavSyncing, setWebdavSyncing] = useState(false);
      const [webdavLastSync, setWebdavLastSync] = useState(() => localStorage.getItem('webdavLastSync') || null);

      useEffect(() => { localStorage.setItem('webdavUrl', webdavUrl); }, [webdavUrl]);
      useEffect(() => { localStorage.setItem('webdavUser', webdavUser); }, [webdavUser]);
      useEffect(() => { localStorage.setItem('webdavPass', webdavPass); }, [webdavPass]);
      useEffect(() => { localStorage.setItem('webdavPath', webdavPath); }, [webdavPath]);
      useEffect(() => { localStorage.setItem('webdavAutoSync', String(webdavAutoSync)); }, [webdavAutoSync]);

      // Cloud Provider & Google Drive Sync State (Mihon/Komikku Architecture)
      const [cloudProvider, setCloudProvider] = useState(() => localStorage.getItem('cloudProvider') || 'gdrive');
      useEffect(() => { localStorage.setItem('cloudProvider', cloudProvider); }, [cloudProvider]);

      const [gdriveClientId, setGdriveClientId] = useState(() => localStorage.getItem('gdrive_client_id') || window.GoogleDriveSync?.getClientId?.() || '');
      const [gdriveConnected, setGdriveConnected] = useState(() => Boolean(window.GoogleDriveSync?.isConnected()));
      const [gdriveUser, setGdriveUser] = useState(() => window.GoogleDriveSync?.userProfile || null);
      const [gdriveFolderMode, setGdriveFolderMode] = useState(() => localStorage.getItem('gdrive_folder_mode') || 'appDataFolder');
      const [gdriveAutoSync, setGdriveAutoSync] = useState(() => localStorage.getItem('gdrive_auto_sync') === 'true');
      const [gdriveLastSync, setGdriveLastSync] = useState(() => localStorage.getItem('gdrive_last_sync') || null);
      const [gdriveTesting, setGdriveTesting] = useState(false);
      const [gdriveSyncing, setGdriveSyncing] = useState(false);
      const [gdriveConfigModalOpen, setGdriveConfigModalOpen] = useState(false);
      const [gdriveManualToken, setGdriveManualToken] = useState('');

      useEffect(() => { localStorage.setItem('gdrive_folder_mode', gdriveFolderMode); }, [gdriveFolderMode]);
      useEffect(() => { localStorage.setItem('gdrive_auto_sync', String(gdriveAutoSync)); }, [gdriveAutoSync]);

      // AI Auto-Glossary Extractor State
      const [autoGlossaryModalOpen, setAutoGlossaryModalOpen] = useState(false);
      const [autoGlossaryChapterCount, setAutoGlossaryChapterCount] = useState(5);
      const [autoGlossaryTargetNovel, setAutoGlossaryTargetNovel] = useState(null);
      const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);
      const [extractedTerms, setExtractedTerms] = useState([]);

      // Name Consistency Verifier State
      const [consistencyModalOpen, setConsistencyModalOpen] = useState(false);
      const [isAuditingConsistency, setIsAuditingConsistency] = useState(false);
      const [consistencyAuditResults, setConsistencyAuditResults] = useState(null);
      // Source Plugins State (§4.1)
      const [sourcePluginsModalOpen, setSourcePluginsModalOpen] = useState(false);
      const [pluginCatalog, setPluginCatalog] = useState([]);
      const [isCatalogLoading, setIsCatalogLoading] = useState(false);
      const [pluginSearchQuery, setPluginSearchQuery] = useState('');
      const [pluginSelectedTab, setPluginSelectedTab] = useState('installed');
      const [customPluginUrl, setCustomPluginUrl] = useState('');
      const [pluginCatalogTick, setPluginCatalogTick] = useState(0);
      const [pluginNovelSearchQuery, setPluginNovelSearchQuery] = useState('');
      const [pluginNovelSearchSource, setPluginNovelSearchSource] = useState('all');
      const [pluginNovelSearchResults, setPluginNovelSearchResults] = useState([]);
      const [isPluginNovelSearching, setIsPluginNovelSearching] = useState(false);
      const [pluginSelectedLangFilter, setPluginSelectedLangFilter] = useState('all');

      // Tachiyomi / Mihon Style Quick Toggles
      const [downloadedOnly, setDownloadedOnly] = useState(() => {
        try { return localStorage.getItem('downloadedOnly') === 'true'; } catch (_) { return false; }
      });
      const [incognitoMode, setIncognitoMode] = useState(() => {
        try { return localStorage.getItem('incognitoMode') === 'true'; } catch (_) { return false; }
      });

      // Cost & Time Estimator State (§7.2)
      const [costEstimatorModalOpen, setCostEstimatorModalOpen] = useState(false);
      const [costEstimatorData, setCostEstimatorData] = useState(null);

      // Cultural Context Footnotes Protocol (§5.10)
      const [culturalFootnotesEnabled, setCulturalFootnotesEnabled] = useState(() => {
        try { return localStorage.getItem('culturalFootnotesEnabled') !== 'false'; } catch (_) { return true; }
      });
      useEffect(() => {
        try { localStorage.setItem('culturalFootnotesEnabled', String(culturalFootnotesEnabled)); } catch (_) {}
      }, [culturalFootnotesEnabled]);

      const [toasts, setToasts] = useState([]);
      const [appVersion, setAppVersion] = useState(VERSION);
      const [appVersionCode, setAppVersionCode] = useState(8280);
      const [renameModalNovel, setRenameModalNovel] = useState(null);
      const [newNovelTitleInput, setNewNovelTitleInput] = useState('');
      const [installingPluginId, setInstallingPluginId] = useState(null);
      useEffect(() => {
        fetch('./version.json?t=' + Date.now())
          .then(r => r.json())
          .then(d => {
            if (d && d.version) {
              VERSION = d.version;
              setAppVersion(d.version);
              if (d.versionCode) setAppVersionCode(d.versionCode);
            }
          })
          .catch(() => {});
      }, []);
      const [availableUpdate, setAvailableUpdate] = useState(null);
      const [downloadSuccessModal, setDownloadSuccessModal] = useState(null);
      const [epubPackagingModal, setEpubPackagingModal] = useState(null);
      const [activeNovelRecord, setActiveNovelRecord] = useState(null);
      const [isUpdating, setIsUpdating] = useState(false);
      const [sideBySide, setSideBySide] = useState(false);
      const [showModal, setShowModal] = useState(false);
      const [modalMessage, setModalMessage] = useState('');
      const [modalCallback, setModalCallback] = useState(null);
      const [history, setHistory] = useState([]);
      const [historySearch, setHistorySearch] = useState('');
      const [showHistory, setShowHistory] = useState(false);
      const [showGlossaryManager, setShowGlossaryManager] = useState(true);
      const [uploadingFile, setUploadingFile] = useState(false);
      const [downloadingPdf, setDownloadingPdf] = useState(false);
      const [downloadingEpub, setDownloadingEpub] = useState(false);
      const [downloadingDocx, setDownloadingDocx] = useState(false);
      const [isOptimizingGlossary, setIsOptimizingGlossary] = useState(false);
      const [isDragOver, setIsDragOver] = useState(false);

      // Storage Diagnostics & Maintenance
      const [storageDiag, setStorageDiag] = useState({ usedMB: 0, quotaMB: 0, pct: 0, available: false });
      const [storageLoading, setStorageLoading] = useState(false);

      const refreshStorageDiag = useCallback(async () => {
        setStorageLoading(true);
        try {
          if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const usedMB = Math.round((est.usage || 0) / (1024 * 1024));
            const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
            const pct = quotaMB > 0 ? Math.min(100, Math.round((usedMB / quotaMB) * 100)) : 0;
            setStorageDiag(prev => {
              if (prev.usedMB === usedMB && prev.quotaMB === quotaMB && prev.pct === pct && prev.available) return prev;
              return { usedMB, quotaMB, pct, available: true };
            });
          } else {
            setStorageDiag(prev => prev.available ? prev : { usedMB: 0, quotaMB: 0, pct: 0, available: false });
          }
          if (typeof loadTrashCount === 'function') {
            await loadTrashCount();
          }
        } catch (e) {
          console.warn('Storage estimate failed:', e);
        } finally {
          setStorageLoading(false);
        }
      }, [loadTrashCount]);

      useEffect(() => {
        if (activeTab === 'settings') {
          refreshStorageDiag();
        }
      }, [activeTab]);

      // --- Core Toast Helper (Defined before any usage) ---
      const toast = (msg, type = 'success', action = null) => {
        if (!msg) return;
        setToasts(prev => {
          if (prev.some(t => t.msg === msg)) return prev;
          const id = genId();
          setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), action ? 7500 : 3200);
          return [...prev.slice(-2), { id, msg, type, action }];
        });
      };

      // Unmask silent errors with immediate toast notification
      const setError = useCallback((msg) => {
        _setError(msg || '');
        if (msg && typeof msg === 'string' && msg.trim()) {
          const isErr = /error|fail|invalid|corrupt/i.test(msg);
          toast(msg, isErr ? 'error' : 'warning');
        }
      }, []);

      // Bind global references for outer helpers
      window.__setDownloadModal = setDownloadSuccessModal;
      window.__toast = toast;
      window.setEpubPackagingModal = setEpubPackagingModal;
      window.notifyModelChange = (fromModel, toModel, reason) => {
        const msg = `⚠️ Model switched: ${fromModel} → ${toModel} (${reason})`;
        toast(msg, 'warning');
        window.NativeBridge?.haptic?.('warning');
      };

      // --- Novel Health & QA Proofreader Handlers (§5.9 + §7.1 + §7.5) ---
      const runNovelHealthAudit = (novelOrChapters, optionsOverride = {}) => {
        if (!window.QAEngine) {
          toast('QA Engine is loading...', 'info');
          return null;
        }
        const opts = {
          checkGaps: optionsOverride.checkGaps !== undefined ? optionsOverride.checkGaps : qaCheckGaps,
          checkCorrupt: optionsOverride.checkCorrupt !== undefined ? optionsOverride.checkCorrupt : qaCheckCorrupt,
          checkCjkLeaks: optionsOverride.checkCjkLeaks !== undefined ? optionsOverride.checkCjkLeaks : (cjkLeakCheckEnabled && qaCheckCjk),
          checkAntiMtl: optionsOverride.checkAntiMtl !== undefined ? optionsOverride.checkAntiMtl : (antiMtlGateEnabled && qaCheckAntiMtl),
          checkLoops: optionsOverride.checkLoops !== undefined ? optionsOverride.checkLoops : qaCheckLoops,
          checkDuplicates: optionsOverride.checkDuplicates !== undefined ? optionsOverride.checkDuplicates : qaCheckDuplicates
        };
        const result = window.QAEngine.auditNovel(novelOrChapters, opts);
        setQaAuditResult(result);
        return result;
      };

      const handleOpenNovelHealthModal = async (item) => {
        const full = await loadFullNovel(item);
        if (!full) {
          toast('Novel data not found.', 'error');
          return;
        }
        setQaAuditNovelRef(full);
        runNovelHealthAudit(full);
        setQaFilterCategory('all');
        setQaModalOpen(true);
      };

      const handleOpenActiveQaModal = () => {
        const chs = (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters
          : (chapters && chapters.length > 0 ? chapters : [{ title: (fileName && fileName.trim()) || 'Active Document', content: assembledText || inputText }]);
        const novelObj = {
          title: (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || 'Active Document',
          chapters: chs
        };
        setQaAuditNovelRef(novelObj);
        runNovelHealthAudit(novelObj);
        setQaFilterCategory('all');
        setQaModalOpen(true);
      };

      useEffect(() => {
        window.openNovelHealthAudit = () => {
          handleOpenActiveQaModal();
        };
      }, [translatedChapters, chapters, assembledText, inputText, fileName, currentDocTitle, activeNovelRecord, qaCheckGaps, qaCheckCorrupt, qaCheckCjk, qaCheckAntiMtl, qaCheckLoops, qaCheckDuplicates, cjkLeakCheckEnabled, antiMtlGateEnabled]);

      // --- Translation Memory & Snapshots Handlers (§8.2 + §8.6) ---
      window.__translationMemoryEnabled = translationMemoryEnabled;

      const refreshTmStats = async () => {
        if (!window.TMDiffEngine) return;
        try {
          const stats = await window.TMDiffEngine.TM.getStats();
          if (stats) setTmStats(stats);
        } catch (e) {
          console.warn('[TM] Stats refresh warning:', e);
        }
      };

      const handleClearTm = async () => {
        if (!window.TMDiffEngine) return;
        if (!confirm('Are you sure you want to clear all cached Translation Memory segments? This cannot be undone.')) return;
        await window.TMDiffEngine.TM.clearTM();
        await refreshTmStats();
        toast('Translation Memory cache cleared.', 'info');
      };

      const handleExportTmx = async () => {
        if (!window.TMDiffEngine) return;
        try {
          const tmx = await window.TMDiffEngine.TM.exportTMX();
          const blob = new Blob([tmx], { type: 'application/xml;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `translation_memory_${new Date().toISOString().slice(0, 10)}.tmx`;
          a.click();
          URL.revokeObjectURL(url);
          toast('Exported Translation Memory (TMX).', 'success');
        } catch (e) {
          toast('Failed exporting TMX: ' + e.message, 'error');
        }
      };

      const handleOpenDiffModal = async (chapterIdx = 0, novelOverride = null) => {
        if (!window.TMDiffEngine) {
          toast('Diff Engine loading...', 'info');
          return;
        }
        const activeNovel = novelOverride || activeNovelRecord;
        const novelKey = activeNovel?.id || (fileName && fileName.trim()) || 'active_doc';
        const chs = (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters
          : (activeNovel?.translatedChapters && activeNovel.translatedChapters.length > 0
              ? activeNovel.translatedChapters
              : (chapters && chapters.length > 0 ? chapters : []));

        const targetCh = chs[chapterIdx] || {
          title: (fileName && fileName.trim()) || 'Active Document',
          content: assembledText || inputText || ''
        };
        const curText = (targetCh.content || targetCh.text || assembledText || '').trim();

        const snapshots = await window.TMDiffEngine.Snapshots.getChapterSnapshots(novelKey, chapterIdx);

        if (!snapshots || snapshots.length === 0) {
          if (!curText) {
            toast('No text or snapshots available for this chapter yet.', 'info');
            return;
          }
          await window.TMDiffEngine.Snapshots.createSnapshot({
            novelId: novelKey,
            chapterIdx: chapterIdx,
            chapterTitle: targetCh.title || `Chapter ${chapterIdx + 1}`,
            text: curText,
            model: geminiModel || 'Current'
          });
          toast('Initial baseline snapshot recorded for this chapter.', 'info');
          const refreshedSnaps = await window.TMDiffEngine.Snapshots.getChapterSnapshots(novelKey, chapterIdx);
          setDiffSnapshotsList(refreshedSnaps);
          setSelectedDiffSnapId(refreshedSnaps[0]?.id || '');
          const diffResult = window.TMDiffEngine.Snapshots.computeDiff(curText, curText);
          setActiveDiffData({
            title: targetCh.title || `Chapter ${chapterIdx + 1}`,
            chapterIdx,
            novelKey,
            ...diffResult
          });
          setDiffModalOpen(true);
          return;
        }

        setDiffSnapshotsList(snapshots);
        const latestSnap = snapshots[snapshots.length - 1];
        setSelectedDiffSnapId(latestSnap.id);
        const diffResult = window.TMDiffEngine.Snapshots.computeDiff(latestSnap.text, curText);
        setActiveDiffData({
          title: targetCh.title || `Chapter ${chapterIdx + 1}`,
          chapterIdx,
          novelKey,
          ...diffResult
        });
        setDiffModalOpen(true);
      };

      const handleManualSnapshot = async () => {
        if (!window.TMDiffEngine || !activeDiffData) return;
        const chs = (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters
          : (activeNovelRecord?.translatedChapters && activeNovelRecord.translatedChapters.length > 0
              ? activeNovelRecord.translatedChapters
              : (chapters && chapters.length > 0 ? chapters : []));
        const targetCh = chs[activeDiffData.chapterIdx] || { content: assembledText || inputText || '' };
        const curText = (targetCh.content || targetCh.text || assembledText || '').trim();
        if (!curText) {
          toast('No text available in this chapter to snapshot.', 'info');
          return;
        }
        await window.TMDiffEngine.Snapshots.createSnapshot({
          novelId: activeDiffData.novelKey,
          chapterIdx: activeDiffData.chapterIdx,
          chapterTitle: activeDiffData.title || `Chapter ${activeDiffData.chapterIdx + 1}`,
          text: curText,
          model: `${geminiModel || 'Current'} (Manual)`
        });
        const refreshedSnaps = await window.TMDiffEngine.Snapshots.getChapterSnapshots(activeDiffData.novelKey, activeDiffData.chapterIdx);
        setDiffSnapshotsList(refreshedSnaps);
        if (refreshedSnaps && refreshedSnaps.length > 0) {
          setSelectedDiffSnapId(refreshedSnaps[refreshedSnaps.length - 1].id);
        }
        toast('Snapshot saved successfully!', 'success');
      };

      const handleSelectDiffSnapshot = (snapId) => {
        setSelectedDiffSnapId(snapId);
        if (!activeDiffData || !window.TMDiffEngine) return;
        const snap = diffSnapshotsList.find(s => s.id === snapId);
        if (!snap) return;

        const chs = (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters
          : (activeNovelRecord?.translatedChapters && activeNovelRecord.translatedChapters.length > 0
              ? activeNovelRecord.translatedChapters
              : (chapters && chapters.length > 0 ? chapters : []));
        const targetCh = chs[activeDiffData.chapterIdx] || { content: assembledText || inputText || '' };
        const curText = (targetCh.content || targetCh.text || assembledText || '').trim();

        const diffResult = window.TMDiffEngine.Snapshots.computeDiff(snap.text, curText);
        setActiveDiffData(prev => ({
          ...prev,
          ...diffResult
        }));
      };

      const handleRollbackDiffSnapshot = async (snapId) => {
        if (!window.TMDiffEngine) return;
        const snap = await window.TMDiffEngine.Snapshots.rollbackSnapshot(snapId);
        if (!snap || !snap.text) {
          toast('Failed to load snapshot for rollback.', 'error');
          return;
        }

        if (!confirm(`Roll back "${snap.chapterTitle || 'Chapter'}" to revision from ${new Date(snap.timestamp).toLocaleString()}?`)) return;

        const chIdx = snap.chapterIdx || 0;
        if (translatedChapters && translatedChapters.length > chIdx) {
          const updated = [...translatedChapters];
          updated[chIdx] = { ...updated[chIdx], content: snap.text };
          setTranslatedChapters(updated);
          const currentDisplay = updated.map(c => `${c?.title || ''}\n\n${c?.content || ''}`).join('\n\n\n').trim();
          setAssembledText(currentDisplay);
        } else {
          setAssembledText(snap.text);
        }

        if (activeNovelRecord) {
          try {
            const full = await loadFullNovel(activeNovelRecord);
            if (full && full.translatedChapters && full.translatedChapters.length > chIdx) {
              full.translatedChapters[chIdx].content = snap.text;
              await saveNovelRecord(full);
            }
          } catch (e) {
            console.warn('[Rollback] DB save warning:', e);
          }
        }

        toast(`↺ Reverted "${snap.chapterTitle || 'Chapter'}" to revision.`, 'success');
        setDiffModalOpen(false);
      };

      useEffect(() => {
        window.openDiffInspector = (chapterIdx = 0, novelObj = null) => {
          handleOpenDiffModal(chapterIdx, novelObj);
        };
        refreshTmStats();
      }, [translatedChapters, chapters, assembledText, inputText, fileName, activeNovelRecord, geminiModel]);

      // --- Source Plugins Handlers (§4.1) ---
      const handleOpenSourcePluginsModal = async () => {
        setSourcePluginsModalOpen(true);
        if (!pluginCatalog || pluginCatalog.length === 0) {
          setIsCatalogLoading(true);
          try {
            if (window.sourceRegistry && typeof window.sourceRegistry.fetchCatalog === 'function') {
              const cat = await window.sourceRegistry.fetchCatalog();
              setPluginCatalog(Array.isArray(cat) ? cat : []);
            }
          } catch (err) {
            console.warn('Failed to fetch LNReader plugins catalog:', err);
            toast('Could not fetch online plugins catalog: ' + err.message, 'warning');
          } finally {
            setIsCatalogLoading(false);
          }
        }
      };

      const handleInstallPlugin = async (item) => {
        try {
          setInstallingPluginId(item.id);
          toast(`Installing ${item.name} plugin…`, 'info');
          await window.sourceRegistry.loadPluginById(item.id);
          setPluginCatalogTick(t => t + 1);
          toast(`✅ Successfully installed ${item.name} (${item.id})!`, 'success');
        } catch (err) {
          toast(`Plugin install failed: ${err.message}`, 'error');
        } finally {
          setInstallingPluginId(null);
        }
      };

      const handleUninstallPlugin = (id) => {
        if (window.sourceRegistry.unregister(id)) {
          setPluginCatalogTick(t => t + 1);
          toast(`Uninstalled plugin: ${id}`, 'info');
        } else {
          toast('Cannot uninstall built-in plugin.', 'warning');
        }
      };

      const handleInstallCustomPluginUrl = async (url) => {
        if (!url || !url.trim()) return;
        try {
          toast('Fetching and installing custom plugin…', 'info');
          await window.sourceRegistry.loadPluginFromUrl(url.trim());
          setPluginCatalogTick(t => t + 1);
          toast('✅ Custom plugin registered and ready!', 'success');
          setCustomPluginUrl('');
        } catch (err) {
          toast(`Custom plugin load failed: ${err.message}`, 'error');
        }
      };

      const handleSearchNovelsInPlugins = async (query, sourceId = 'all') => {
        const q = (query || pluginNovelSearchQuery || '').trim();
        if (!q) {
          return toast('Please enter a novel title or keyword to search (e.g. Shadow Slave, Re:Zero).', 'warning');
        }
        setIsPluginNovelSearching(true);
        try {
          const reg = window.sourceRegistry || window.SourceRegistry;
          let results = [];
          if (sourceId && sourceId !== 'all' && reg && typeof reg.searchPlugin === 'function') {
            results = await reg.searchPlugin(sourceId, q);
          } else {
            // Concurrent parallel search across plugins and built-in scrapers
            const promises = [];
            if (reg && typeof reg.searchAll === 'function') {
              promises.push(reg.searchAll(q).catch(e => { console.warn('[searchAll]', e); return []; }));
            }
            if (window.WebNovelImporter?.searchNovels) {
              promises.push(window.WebNovelImporter.searchNovels(q, 'all').catch(e => { console.warn('[importerSearch]', e); return []; }));
            }
            const resLists = await Promise.all(promises);
            const seenUrls = new Set();
            for (const list of resLists) {
              if (Array.isArray(list)) {
                for (const item of list) {
                  const itemUrl = (item.url || item.path || '').replace(/\/$/, '');
                  if (itemUrl && !seenUrls.has(itemUrl)) {
                    seenUrls.add(itemUrl);
                    let title = (item.title || item.name || '').trim();
                    if (!title || /^untitled/i.test(title)) {
                      try {
                        const pathParts = itemUrl.split('/').filter(Boolean);
                        const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
                        if (slug && !slug.startsWith('http')) {
                          title = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        }
                      } catch (_) {}
                    }
                    results.push({
                      ...item,
                      id: item.id || itemUrl,
                      title: title || 'Web Novel',
                      name: title || 'Web Novel',
                      url: item.url || item.path,
                      source: item.source || 'Plugin'
                    });
                  }
                }
              }
            }
          }
          setPluginNovelSearchResults(results || []);
          if (!results || results.length === 0) {
            toast(`No novels found for "${q}". Try another query or install more plugins!`, 'info');
          } else {
            toast(`Found ${results.length} novels across active plugins & sources!`, 'success');
          }
        } catch (err) {
          console.error('[handleSearchNovelsInPlugins]', err);
          toast('Plugin novel search error: ' + (err?.message || err), 'error');
        } finally {
          setIsPluginNovelSearching(false);
        }
      };

      const handleCheckRezeroUpdates = async () => {
        try {
          toast('👑 Checking Witch Cult Translations for new chapters…', 'info');
          const wctUrl = 'https://witchculttranslation.com/table-of-content/';
          setWebImportUrl(wctUrl);

          const existing = (webImportHistory || []).find(n => /witchcult|rezero/i.test(n?.sourceUrl || n?.url || n?.title || ''))
            || (activeCrawlSession && /witchcult|rezero/i.test(activeCrawlSession?.sourceUrl || activeCrawlSession?.url || activeCrawlSession?.title || '') ? activeCrawlSession : null);

          const existingChapters = existing?.chapters || existing?.rawChapters || (chapters && chapters.length > 0 && /rezero|witch/i.test(activeNovelRecord?.title || '') ? chapters : []);

          if (!window.WebNovelImporter || typeof window.WebNovelImporter.importUrl !== 'function') {
            return toast('Web Importer engine not loaded.', 'error');
          }

          setWebImportStatus('Scanning live Table of Contents…');
          const tocResult = await window.WebNovelImporter.importUrl(wctUrl, (msg) => setWebImportStatus(msg), { tocOnly: true });
          const remoteList = tocResult?.chapterList || (tocResult?.chapters && tocResult.chapters.length > 0 ? tocResult.chapters : []);

          if (!remoteList || remoteList.length === 0) {
            toast('Could not scan WCT chapter list. Check network connection.', 'warning');
            return;
          }

          const existingUrls = new Set((existingChapters || []).map(c => (c.url || '').replace(/\/$/, '')).filter(Boolean));
          const existingTitles = new Set((existingChapters || []).map(c => (c.title || '').trim().toLowerCase()).filter(Boolean));

          const newChapters = remoteList.filter(c => {
            const cleanU = (c.url || '').replace(/\/$/, '');
            const cleanT = (c.title || '').trim().toLowerCase();
            const hasUrl = cleanU && existingUrls.has(cleanU);
            const hasTitle = cleanT && existingTitles.has(cleanT);
            return !hasUrl && !hasTitle;
          });

          if (newChapters.length === 0 && existingChapters.length > 0) {
            toast(`👑 Re:Zero is 100% up to date! All ${existingChapters.length} chapters downloaded.`, 'success');
            setWebImportStatus('');
            return;
          }

          if (existingChapters.length === 0) {
            toast(`👑 Re:Zero TOC discovered ${remoteList.length} chapters. Starting ingestion…`, 'info');
            handleStartFetch(false, null, false, wctUrl);
            return;
          }

          toast(`👑 Found ${newChapters.length} new chapters! Downloading incrementally…`, 'success');
          handleStartFetch(true, {
            id: existing?.id,
            url: wctUrl,
            sourceUrl: wctUrl,
            title: existing?.title || 'Re:Zero − Starting Life in Another World (WCT)',
            author: 'Tappei Nagatsuki',
            cover: existing?.cover || 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg',
            chapters: existingChapters,
            rawChapters: existingChapters,
            totalChapterCount: remoteList.length
          }, false, wctUrl);
        } catch (err) {
          console.error('[handleCheckRezeroUpdates]', err);
          toast('Re:Zero update check failed: ' + (err?.message || err), 'error');
        } finally {
          setWebImportStatus('');
        }
      };

      // --- Cost & Time Estimator Handlers (§7.2) ---
      const handleOpenCostEstimator = () => {
        let chs = (chapters && chapters.length > 0) ? chapters : [];
        let totalChars = 0;
        let totalWords = 0;

        if (chs.length > 0) {
          for (const c of chs) {
            const t = (typeof c === 'string' ? c : (c?.text || c?.content || ''));
            totalChars += t.length;
            totalWords += t.split(/\s+/).filter(Boolean).length;
          }
        } else if (inputText && inputText.trim()) {
          totalChars = inputText.length;
          totalWords = inputText.split(/\s+/).filter(Boolean).length;
          chs = [{ title: 'Current Text', content: inputText }];
        }

        if (totalChars === 0) {
          toast('Please paste text or load a novel/EPUB before estimating cost.', 'warning');
          return;
        }

        const estSourceTokens = Math.round(totalChars / 2.8);
        const glossaryTermsActive = glossaryTermCount || 0;
        const estGlossaryTokens = smartGlossary ? Math.min(chs.length * 40, glossaryTermsActive * 12) : (glossaryTermsActive * 15);
        const estGenderTokens = Object.keys(genderLocks || {}).length * 8;
        const estSystemOverhead = chs.length * 85;
        const totalPromptTokens = estSourceTokens + estGlossaryTokens + estGenderTokens + estSystemOverhead;
        const totalOutputTokens = Math.max(Math.round(totalWords * 1.3), Math.round(estSourceTokens * 0.75));
        const totalTokens = totalPromptTokens + totalOutputTokens;

        const models = [
          {
            id: 'gemini-2.5-flash-lite',
            name: 'Gemini 3.5 Flash-Lite',
            tag: 'Most Cost Effective ⚡',
            inRate: 0.075,
            outRate: 0.30,
            recommended: true
          },
          {
            id: 'gemini-2.5-flash',
            name: 'Gemini 3.7 Flash',
            tag: 'Balanced Quality & Speed',
            inRate: 0.10,
            outRate: 0.40,
            recommended: false
          },
          {
            id: 'gemini-2.5-flash-thinking',
            name: 'Gemini 3.8 Flash (Thinking)',
            tag: 'High Nuance & Slang',
            inRate: 0.15,
            outRate: 0.60,
            recommended: false
          },
          {
            id: 'deepseek-chat',
            name: 'DeepSeek V3',
            tag: 'Web Novel Specialist',
            inRate: 0.14,
            outRate: 0.28,
            recommended: false
          },
          {
            id: 'gemini-2.5-pro',
            name: 'Gemini 3.5 Pro',
            tag: 'Maximum Literary Depth',
            inRate: 1.25,
            outRate: 5.00,
            recommended: false
          }
        ];

        const calculatedModels = models.map(m => {
          const inCost = (totalPromptTokens / 1000000) * m.inRate;
          const outCost = (totalOutputTokens / 1000000) * m.outRate;
          const totalCost = inCost + outCost;
          return {
            ...m,
            inCost,
            outCost,
            totalCost: totalCost < 0.01 ? '< $0.01' : `$${totalCost.toFixed(3)}`
          };
        });

        const wordsPerSecStream = 55;
        const baseSecs = Math.max(5, Math.round(totalWords / wordsPerSecStream));
        const timeTiers = [
          { streams: 1, duration: formatDuration(baseSecs) },
          { streams: 5, duration: formatDuration(Math.max(3, Math.round(baseSecs / 4.2))), recommended: true },
          { streams: 10, duration: formatDuration(Math.max(2, Math.round(baseSecs / 7.5))) },
          { streams: 15, duration: formatDuration(Math.max(2, Math.round(baseSecs / 10.5))) }
        ];

        function formatDuration(sec) {
          if (sec < 60) return `${sec}s`;
          const mins = Math.floor(sec / 60);
          const rem = sec % 60;
          return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
        }

        setCostEstimatorData({
          chapterCount: chs.length,
          totalChars,
          totalWords,
          estSourceTokens,
          totalPromptTokens,
          totalOutputTokens,
          totalTokens,
          models: calculatedModels,
          timeTiers
        });
        setCostEstimatorModalOpen(true);
      };

      // --- AniList Metadata Enrichment Handlers (§7.4) ---
      const handleEnrichNovelMetadata = async (novelRecord) => {
        if (!novelRecord || !novelRecord.title) {
          toast('No novel selected for metadata enrichment.', 'warning');
          return;
        }
        let rawTitle = novelRecord.title.replace(/\s*\(Translated\)\s*$/i, '').trim();
        // Clean title for higher matching accuracy
        const cleanQuery = rawTitle
          .replace(/\s*[-—~|:]\s*(?:Web Novel Complete Edition|Complete Edition|Web Novel|Arc Edition|Starting Life in Another World|Lnori|Syosetu|NovelBuddy|RoyalRoad|Witch Cult).*$/i, '')
          .replace(/\s*\(.*?\)\s*/g, ' ')
          .replace(/\s*\[.*?\]\s*/g, ' ')
          .trim() || rawTitle;

        toast(`Fetching official metadata for "${cleanQuery}"…`, 'info');
        try {
          let metadata = null;
          let sourceProvider = 'AniList';

          // 1. Try AniList GraphQL first (with strict 3.5s timeout)
          try {
            const query = `
              query ($search: String) {
                Media (search: $search, type: MANGA) {
                  id
                  title { romaji english native }
                  description(asHtml: false)
                  coverImage { extraLarge large }
                  genres
                  averageScore
                  status
                }
              }
            `;
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3500);
            const res = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              signal: ctrl.signal,
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ query, variables: { search: cleanQuery } })
            });
            clearTimeout(timer);
            if (res.ok) {
              const data = await res.json();
              const media = data?.data?.Media;
              if (media) {
                metadata = {
                  title: media.title?.english || media.title?.romaji || media.title?.native || rawTitle,
                  cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
                  summary: (media.description || '').replace(/<[^>]*>/g, '').trim(),
                  genres: Array.isArray(media.genres) ? media.genres : [],
                  rating: media.averageScore,
                  id: media.id
                };
              }
            }
          } catch (_) {
            // Fallback to Kitsu API
          }

          // 2. High-Availability Fallback: Kitsu Light Novel / Manga Catalog (CORS-friendly, zero rate-limiting)
          if (!metadata) {
            try {
              sourceProvider = 'Kitsu / Manga Catalog';
              const ctrl = new AbortController();
              const timer = setTimeout(() => ctrl.abort(), 4500);
              const kRes = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(cleanQuery)}&page[limit]=1`, { signal: ctrl.signal });
              clearTimeout(timer);
              if (kRes.ok) {
                const kData = await kRes.json();
                const item = kData?.data?.[0]?.attributes;
                if (item) {
                  const ratingVal = item.averageRating ? Math.round(parseFloat(item.averageRating)) : null;
                  metadata = {
                    title: item.canonicalTitle || cleanQuery,
                    cover: item.posterImage?.large || item.posterImage?.original || item.posterImage?.medium || '',
                    summary: (item.synopsis || '').replace(/<[^>]*>/g, '').trim(),
                    genres: [item.mangaType || 'Light Novel', ...(item.subtype ? [item.subtype] : [])],
                    rating: ratingVal,
                    id: kData?.data?.[0]?.id
                  };
                }
              }
            } catch (_) {}
          }

          if (!metadata) {
            toast(`No matching metadata found for "${cleanQuery}".`, 'warning');
            return;
          }

          const bestTitle = metadata.title;
          const coverUrl = metadata.cover;
          const summary = metadata.summary;
          const genres = metadata.genres;

          const confirmMsg = `Found metadata via ${sourceProvider}:\n\nTitle: ${bestTitle}\nGenres: ${genres.join(', ') || 'None'}\nRating: ${metadata.rating ? metadata.rating + '%' : 'N/A'}\n\nApply enriched cover art, synopsis, and tags to this novel?`;
          if (confirm(confirmMsg)) {
            const updates = {
              enrichedTitle: bestTitle,
              cover: coverUrl || novelRecord.cover,
              summary: summary || novelRecord.summary,
              genres: genres,
              metadataId: metadata.id,
              rating: metadata.rating
            };
            if (window.novelDB && novelRecord.id) {
              await window.novelDB.novels.update(novelRecord.id, updates);
            }
            setWebImportHistory(prev => prev.map(b => b.id === novelRecord.id ? { ...b, ...updates } : b));
            if (activeNovelView && activeNovelView.id === novelRecord.id) {
              setActiveNovelView(prev => ({ ...prev, ...updates }));
            }
            toast(`Enriched "${bestTitle}" with official HD cover art & synopsis!`, 'success');
          }
        } catch (err) {
          console.warn('Metadata enrichment error:', err);
          toast(`Metadata enrichment error: ${err.message}`, 'error');
        }
      };

      // --- Split Novel into Arcs Handler (§7.3) ---
      const handleSplitNovelIntoArcs = async (novelRecord) => {
        const full = await loadFullNovel(novelRecord);
        if (!full) {
          toast('Novel data not found in database.', 'error');
          return;
        }
        const chs = (full.translatedChapters && full.translatedChapters.length > 0)
          ? full.translatedChapters
          : (full.rawChapters || full.chapters || []);
        if (chs.length === 0) {
          toast('No chapters available to split.', 'warning');
          return;
        }

        setActiveTab('studio');
        setStudioSubTab('split');
        localStorage.setItem('activeTab', 'studio');
        toast(`Packaging "${full.title || 'Novel'}" into Volume Splitter…`, 'info');
        try {
          const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(full.title, chs) : (full.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(full.author) : (full.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, full.targetLang || 'en');
          const safeName = (typeof sanitizeFilename === 'function' ? sanitizeFilename(novelTitle) : novelTitle.replace(/[^a-zA-Z0-9_-]/g, '_')) || 'Novel';
          const file = new File([blob], `${safeName}.epub`, { type: 'application/epub+zip' });
          setTimeout(() => {
            if (typeof window.processSplitFile === 'function') {
              window.processSplitFile(file);
              toast(`Loaded "${novelTitle}" (${chs.length} chapters) into Volume Splitter!`, 'success');
            }
          }, 250);
        } catch (splitErr) {
          console.warn('Auto-split mounting warning:', splitErr);
          toast(`Switched to EPUB Studio with "${full.title || 'Novel'}"!`, 'info');
        }
      };

      // Update Handlers
      
      
      const testSingleKey = async (prov, keyStr, keyId) => {
        if (!keyStr || !keyStr.trim()) {
          setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: '❌ Key is empty' } }));
          return;
        }
        setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'testing', message: 'Testing connection & latency…' } }));
        const start = performance.now();
        const trimmedKey = keyStr.trim();
        try {
          if (prov === 'gemini') {
            const targetTestModel = (geminiModel || 'gemini-3.8-flash');
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetTestModel}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
            const r = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': trimmedKey },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 5 } })
            });
            const latency = Math.round(performance.now() - start);
            if (r.ok) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', latency, message: `🟢 Healthy & Active (${latency}ms)` } }));
            } else {
              const body = await r.text().catch(() => '');
              let detail = '';
              try {
                const j = JSON.parse(body);
                detail = j.error?.message || `HTTP ${r.status}`;
              } catch(e) { detail = body.slice(0, 120) || `HTTP ${r.status}`; }
              
              const retryMatch = detail.match(/retry in\s+([\d\.]+)\s*s/i);
              if (r.status === 429) {
                if (retryMatch) {
                  const sec = Math.ceil(parseFloat(retryMatch[1]));
                  setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'cooling', message: `⏳ Cooldown (${sec}s remaining · Key is Valid)` } }));
                } else if (/quota|exhausted/i.test(detail)) {
                  setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'exhausted', message: `🔴 Daily Quota Exhausted (${latency}ms)` } }));
                } else {
                  setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'cooling', message: `⏳ Rate Limited (429 · ${latency}ms)` } }));
                }
              } else if (r.status === 400 || r.status === 403) {
                setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Invalid Key / Unauthorized (${r.status})` } }));
              } else {
                setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ HTTP ${r.status}: ${detail}` } }));
              }
            }
          } else if (prov === 'deepseek') {
            const r = await fetch('https://api.deepseek.com/models', {
              headers: { 'Authorization': `Bearer ${trimmedKey}` }
            });
            const latency = Math.round(performance.now() - start);
            if (r.ok) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', latency, message: `🟢 DeepSeek Active (${latency}ms)` } }));
            } else if (r.status === 401 || r.status === 403) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Invalid DeepSeek Key (${r.status})` } }));
            } else if (r.status === 429) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'cooling', message: `⏳ DeepSeek Rate Limited (429 · ${latency}ms)` } }));
            } else {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ DeepSeek Error: HTTP ${r.status}` } }));
            }
          } else if (prov === 'openai') {
            const r = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': `Bearer ${trimmedKey}` }
            });
            const latency = Math.round(performance.now() - start);
            if (r.ok) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', latency, message: `🟢 OpenAI Active (${latency}ms)` } }));
            } else if (r.status === 401 || r.status === 403) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Invalid OpenAI Key (${r.status})` } }));
            } else if (r.status === 429) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'cooling', message: `⏳ OpenAI Rate Limited / Quota Exceeded (429)` } }));
            } else {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ OpenAI Error: HTTP ${r.status}` } }));
            }
          } else if (prov === 'claude') {
            const r = await fetch('https://api.anthropic.com/v1/models', {
              headers: { 'x-api-key': trimmedKey, 'anthropic-version': '2023-06-01' }
            });
            const latency = Math.round(performance.now() - start);
            if (r.ok) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', latency, message: `🟢 Anthropic Active (${latency}ms)` } }));
            } else if (r.status === 401 || r.status === 403) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Invalid Anthropic Key (${r.status})` } }));
            } else {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Anthropic HTTP ${r.status}` } }));
            }
          } else if (prov === 'deepl') {
            const isFree = trimmedKey.endsWith(':fx');
            const endpoint = isFree ? 'https://api-free.deepl.com/v2/usage' : 'https://api.deepl.com/v2/usage';
            const r = await fetch(endpoint, {
              headers: { 'Authorization': `DeepL-Auth-Key ${trimmedKey}` }
            });
            const latency = Math.round(performance.now() - start);
            if (r.ok) {
              let usageInfo = '';
              try {
                const u = await r.json();
                if (u.character_count !== undefined && u.character_limit !== undefined) {
                  const pct = Math.round((u.character_count / u.character_limit) * 100);
                  usageInfo = ` (${pct}% used · ${(u.character_count).toLocaleString()}/${(u.character_limit).toLocaleString()} chars)`;
                }
              } catch(e) {}
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', latency, message: `🟢 DeepL ${isFree ? 'Free' : 'Pro'} Active (${latency}ms)${usageInfo}` } }));
            } else if (r.status === 403) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Invalid DeepL Key (403)` } }));
            } else if (r.status === 456) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'exhausted', message: `🔴 DeepL Quota Exceeded (456)` } }));
            } else if (r.status === 429) {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'cooling', message: `⏳ DeepL Rate Limited (429 · ${latency}ms)` } }));
            } else {
              setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ DeepL Error: HTTP ${r.status}` } }));
            }
          } else {
            setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'ok', message: '🟢 Key Saved & Ready' } }));
          }
        } catch(err) {
          setKeyHealth(prev => ({ ...prev, [keyId]: { status: 'error', message: `❌ Network Error: ${err.message || 'connection failed'}` } }));
        }
      };

      const handleTestAllKeys = async (prov) => {
        const provKeys = (apiKeysByProvider[prov] || []).filter(k => k.key && k.key.trim());
        if (provKeys.length === 0) { toast('No keys to test', 'info'); return; }
        setTestingKeys(true);
        toast(`Testing ${provKeys.length} ${prov.toUpperCase()} keys against Google servers…`, 'info');
        for (const k of provKeys) {
          await testSingleKey(prov, k.key, k.id);
          await new Promise(r => setTimeout(r, 200));
        }
        setTestingKeys(false);
        toast('🎉 Key testing completed!', 'success');
      };

      const handleBulkImportKeys = () => {
        if (!bulkKeyText.trim()) return;
        const rawLines = bulkKeyText.split(/[\r\n,;]+/);
        const validKeys = rawLines.map(k => k.trim()).filter(k => k.length > 15);
        if (validKeys.length === 0) {
          toast('No valid API keys detected. Keys are usually 30+ characters.', 'error');
          return;
        }

        const prov = provider;
        const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
        const provName = provNames[prov] || prov.toUpperCase();

        const newProfiles = validKeys.map((k, idx) => ({
          id: genId(),
          name: `${provName} Key ${idx + 1}`,
          key: k
        }));

        setApiKeysByProvider(prev => {
          const updated = { ...prev, [prov]: newProfiles };
          localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
          return updated;
        });

        if (newProfiles.length > 0) {
          setActiveKeyIds(prev => {
            const updated = { ...prev, [prov]: newProfiles[0].id };
            localStorage.setItem('activeKeyIds', JSON.stringify(updated));
            return updated;
          });
        }

        setBulkKeyText('');
        setBulkKeyModalOpen(false);
        toast(`🎉 Successfully imported ${newProfiles.length} ${provName} API keys!`, 'success');
      };

      const getReportSummaryText = (overrideStats = null) => {
        const s = overrideStats || lastUsageStats;
        const lines = [
          '=== 📊 TRANSLATION DIAGNOSTICS REPORT ===',
          s ? `Model: ${s.provider || ''} · ${s.model || ''}` : `Model: ${provider} · ${provider === 'gemini' ? (geminiModel || 'gemini-3.7-flash') : deepseekModel}`,
          `Typewriter Streaming: ${s ? (s.enableStreaming ? 'ON' : 'OFF') : (enableStreaming ? 'ON' : 'OFF')} | Extended Thinking: ${s ? (s.enableThinking ? 'ON' : 'OFF') : (enableThinking ? 'ON' : 'OFF')} | Strict Model: ${(s ? s.strictModel : strictModel) ? 'ON' : 'OFF'}`,
          `Context-Aware Memory: ${s ? (s.contextAware ? 'ON' : 'OFF') : (contextAware ? 'ON' : 'OFF')} | Concurrency: ${s ? (s.concurrency || 1) : concurrency} parallel stream(s)`,
          `Chunk Size Preset: ${(s?.chunkSizePreset || chunkSizePreset || 'turbo').toUpperCase()} | Smart Glossary: ${(s ? s.smartGlossary : smartGlossary) ? 'ON' : 'OFF'} (${s ? s.glossaryTermCount : glossaryTermCount} terms loaded)`,
          s ? `Tokens: ${(s.totalTokens || 0).toLocaleString()} (${(s.promptTokens || 0).toLocaleString()} in · ${(s.outputTokens || 0).toLocaleString()} out)` : 'Tokens: In-flight / pending completion'
        ];
        if (s?.breakdown && s.promptTokens > 0) {
          const b = s.breakdown;
          if (b.glossaryTokens > 0) lines.push(`  ├─ Injected Glossary: ${b.glossaryTokens.toLocaleString()} tokens (${b.glossaryPct}%)`);
          lines.push(`  ├─ Raw Source Text: ${b.sourceTokens.toLocaleString()} tokens (${b.sourcePct}%)`);
          if (b.genderTokens > 0) lines.push(`  ├─ Gender Lock Protocol: ${b.genderTokens.toLocaleString()} tokens (${b.genderPct}%)`);
          if (b.contextTokens > 0) lines.push(`  ├─ Context-Aware Memory: ${b.contextTokens.toLocaleString()} tokens (${b.contextPct}%)`);
          lines.push(`  └─ System & Rules Overhead: ${b.systemTokens.toLocaleString()} tokens (${b.systemPct}%)`);
        }
        lines.push(
          s ? `Cost: ${s.cost || '$0.0000'} | Time: ${s.duration || ''} (${s.speed || 'N/A'}) | Words: ${wordCount(assembledText).toLocaleString()}` : `Words: ${wordCount(assembledText).toLocaleString()}`
        );
        return lines.join('\n');
      };

      // [📋 Copy Report] button: ONLY copies the clean diagnostic summary block
      const copyDiagnosticsReport = () => {
        const text = getReportSummaryText();
        navigator.clipboard.writeText(text).then(() => {
          toast('📋 Diagnostics summary copied to clipboard!', 'success');
        }).catch(() => {
          toast('Failed to copy report', 'error');
        });
      };

      // [📋 Copy Logs] button: copies BOTH the diagnostic summary block AND the telemetry event stream
      const copyLogsWithReport = () => {
        const summary = getReportSummaryText();
        const logs = window.AppLogger ? window.AppLogger.getFormattedText() : 'No logs recorded.';
        const fullText = `${summary}\n\n=== 📜 RECENT TELEMETRY EVENTS ===\n${logs}`;
        navigator.clipboard.writeText(fullText).then(() => {
          toast('📋 Report summary & Telemetry logs copied to clipboard!', 'success');
        }).catch(() => {
          toast('Failed to copy logs', 'error');
        });
      };

      const checkForAppUpdate = async (isManual = false) => {
        if (isManual) toast('Checking for updates...', 'info');
        try {
          const parseV = v => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
          let update = null;
          if (window.NativeBridge && typeof window.NativeBridge.checkForUpdate === 'function') {
            update = await window.NativeBridge.checkForUpdate(VERSION);
          }
          if (!update || !update.latestVersion) {
            // Web fallback: query GitHub releases and version manifest concurrently
            const candidates = [];
            let discoveredApk = null;
            const q1 = fetch('https://api.github.com/repos/ExZyO/Gemini-Translator/releases/latest?t=' + Date.now()).then(async r => {
              if (r.ok) {
                const d = await r.json();
                const m = (d.name || '').match(/v?(\d+\.\d+\.\d+)/i) || (d.tag_name || '').match(/v?(\d+\.\d+\.\d+)/i);
                if (m) candidates.push(m[1]);
                if (Array.isArray(d.assets)) {
                  const a = d.assets.find(x => x.name && x.name.toLowerCase().endsWith('.apk'));
                  if (a?.browser_download_url) discoveredApk = a.browser_download_url;
                }
              }
            }).catch(() => {});
            const q2 = fetch('https://raw.githubusercontent.com/ExZyO/Gemini-Translator/main/version.json?t=' + Date.now()).then(async r => {
              if (r.ok) {
                const d = await r.json();
                if (d?.version) candidates.push(d.version);
                if (d?.apkUrl || d?.downloadUrl) discoveredApk = d.apkUrl || d.downloadUrl;
              }
            }).catch(() => {});
            await Promise.allSettled([q1, q2]);

            if (candidates.length > 0) {
              candidates.sort((a, b) => {
                const [a1, a2, a3] = parseV(a);
                const [b1, b2, b3] = parseV(b);
                if (b1 !== a1) return b1 - a1;
                if (b2 !== a2) return b2 - a2;
                return b3 - a3;
              });
              const bestVer = candidates[0];
              const [rMaj=0, rMin=0, rPat=0] = parseV(bestVer);
              const [cMaj=0, cMin=0, cPat=0] = parseV(VERSION);
              const isNewer = (rMaj > cMaj) || (rMaj === cMaj && rMin > cMin) || (rMaj === cMaj && rMin === cMin && rPat > cPat);
              const latestTag = `v${[rMaj, rMin, rPat].join('.')}`;
              update = {
                isNewer,
                latestVersion: latestTag,
                currentVersion: 'v' + [cMaj, cMin, cPat].join('.'),
                apkUrl: discoveredApk || `https://github.com/ExZyO/Gemini-Translator/releases/download/${latestTag}/GeminiTranslator.apk`,
                releasePage: `https://github.com/ExZyO/Gemini-Translator/releases/tag/${latestTag}`
              };
            }
          }

          if (update && update.isNewer) {
            setAvailableUpdate(update);
            if (isManual) toast(`New version ${update.latestVersion} available!`, 'success');
          } else {
            setAvailableUpdate(null);
            if (isManual) {
              const remoteVer = update?.latestVersion || `v${VERSION}`;
              toast(`You are on the latest version (${remoteVer})!`, 'success');
            }
          }
        } catch (e) {
          if (isManual) toast('Failed to check for updates: ' + e.message, 'error');
        }
      };

      const handlePerformUpdate = async () => {
        setIsUpdating(true);
        toast('⬇️ Starting update download...', 'info');
        try {
          const apkUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
          const installResult = await window.NativeBridge?.installApk(apkUrl);
          if (installResult && installResult.success === false) {
            throw new Error(installResult.message || 'The package installer could not be launched.');
          }
          toast('🎉 Download complete. Opening package installer...', 'success');
        } catch (err) {
          console.error('Update error:', err);
          const updateError = err?.message || String(err);
          if (/unknown apps|allow from this source/i.test(updateError)) {
            toast('Permission required: Please enable "Allow from this source" in Settings, then tap Update again.', 'warning', 7000);
          } else {
            toast('Failed to install update: ' + updateError + '. Opening browser download...', 'error', 5000);
            const fallbackUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
            window.open(fallbackUrl, '_blank');
          }
        } finally {
          setIsUpdating(false);
        }
      };

      useEffect(() => {
        checkForAppUpdate(false);
      }, []);

      // --- Refs for Text Areas & Files ---
      // --- Refs for Text Areas & Files ---
      const inputRef = useRef(null);
      const outputRef = useRef(null);
      const instructionsRef = useRef(null);
      const glossaryRef = useRef(null);
      const fileInputRef = useRef(null);
      const epubRestoreInputRef = useRef(null);
      const glossaryFileRef = useRef(null);
      const backupFileInputRef = useRef(null);
      const abortRef = useRef(null);

      // --- Resizable Text Boxes Height State (Touch & Desktop) ---
      const [inputBoxHeight, setInputBoxHeight] = useState(() => parseInt(localStorage.getItem('inputBoxHeight'), 10) || 220);
      const [outputBoxHeight, setOutputBoxHeight] = useState(() => parseInt(localStorage.getItem('outputBoxHeight'), 10) || 250);
      const [instructionsBoxHeight, setInstructionsBoxHeight] = useState(() => parseInt(localStorage.getItem('instructionsBoxHeight'), 10) || 80);
      const [glossaryBoxHeight, setGlossaryBoxHeight] = useState(() => parseInt(localStorage.getItem('glossaryBoxHeight'), 10) || 140);

      const handlePointerResizeStart = (e, boxType) => {
        if (e.button !== undefined && e.button !== 0) return;
        const startY = e.clientY;
        const initialHeights = {
          input: inputBoxHeight,
          output: outputBoxHeight,
          instructions: instructionsBoxHeight,
          glossary: glossaryBoxHeight
        };
        const minHeights = { input: 120, output: 120, instructions: 50, glossary: 80 };
        const maxHeights = { input: 3500, output: 3500, instructions: 1200, glossary: 2500 };
        const startH = initialHeights[boxType] || 200;
        let lastH = startH;

        const targetEl = e.currentTarget || e.target;
        try {
          if (targetEl && typeof targetEl.setPointerCapture === 'function') {
            targetEl.setPointerCapture(e.pointerId);
          }
        } catch (_) {}

        const onPointerMove = (moveEvt) => {
          const delta = (moveEvt.clientY - startY);
          const newH = Math.max(minHeights[boxType] || 80, Math.min(maxHeights[boxType] || 2500, Math.round(startH + delta)));
          lastH = newH;
          if (boxType === 'input') setInputBoxHeight(newH);
          else if (boxType === 'output') setOutputBoxHeight(newH);
          else if (boxType === 'instructions') setInstructionsBoxHeight(newH);
          else if (boxType === 'glossary') setGlossaryBoxHeight(newH);
        };

        const onPointerUp = (upEvt) => {
          try {
            if (targetEl && typeof targetEl.releasePointerCapture === 'function') {
              targetEl.releasePointerCapture(upEvt.pointerId);
            }
          } catch (_) {}
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          localStorage.setItem(`${boxType}BoxHeight`, lastH);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      };

      const handleTouchResizeStart = (e, boxType) => {
        const touch = e.touches && e.touches[0];
        if (!touch) return;
        const startY = touch.clientY;
        const initialHeights = {
          input: inputBoxHeight,
          output: outputBoxHeight,
          instructions: instructionsBoxHeight,
          glossary: glossaryBoxHeight
        };
        const minHeights = { input: 120, output: 120, instructions: 50, glossary: 80 };
        const maxHeights = { input: 3500, output: 3500, instructions: 1200, glossary: 2500 };
        const startH = initialHeights[boxType] || 200;
        let lastH = startH;

        const onTouchMove = (moveEvt) => {
          const curTouch = moveEvt.touches && moveEvt.touches[0];
          if (!curTouch) return;
          const delta = (curTouch.clientY - startY) * 1.85;
          const newH = Math.max(minHeights[boxType] || 80, Math.min(maxHeights[boxType] || 2500, Math.round(startH + delta)));
          lastH = newH;
          if (boxType === 'input') setInputBoxHeight(newH);
          else if (boxType === 'output') setOutputBoxHeight(newH);
          else if (boxType === 'instructions') setInstructionsBoxHeight(newH);
          else if (boxType === 'glossary') setGlossaryBoxHeight(newH);
        };

        const onTouchEnd = () => {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          localStorage.setItem(`${boxType}BoxHeight`, lastH);
        };

        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
      };

      const setBoxPreset = (boxType, preset) => {
        const refs = {
          input: inputRef,
          output: outputRef,
          instructions: instructionsRef,
          glossary: glossaryRef
        };
        const defaults = { input: 220, output: 250, instructions: 80, glossary: 140 };
        const talls = { input: 820, output: 820, instructions: 380, glossary: 600 };

        let targetH = defaults[boxType];
        if (preset === 'S') targetH = defaults[boxType];
        else if (preset === 'auto') {
          const el = refs[boxType]?.current;
          if (el) {
            targetH = Math.max(defaults[boxType], Math.min(4000, el.scrollHeight + 25));
          } else {
            targetH = talls[boxType];
          }
        }

        if (boxType === 'input') setInputBoxHeight(targetH);
        else if (boxType === 'output') setOutputBoxHeight(targetH);
        else if (boxType === 'instructions') setInstructionsBoxHeight(targetH);
        else if (boxType === 'glossary') setGlossaryBoxHeight(targetH);
        localStorage.setItem(`${boxType}BoxHeight`, targetH);
      };

      const toggleBoxExpand = (boxType) => {
        const defaults = { input: 220, output: 250, instructions: 80, glossary: 140 };
        const expanded = { input: 750, output: 750, instructions: 350, glossary: 550 };
        const curHeights = {
          input: inputBoxHeight,
          output: outputBoxHeight,
          instructions: instructionsBoxHeight,
          glossary: glossaryBoxHeight
        };
        const cur = curHeights[boxType] || defaults[boxType];
        const target = (cur >= expanded[boxType] - 60) ? defaults[boxType] : expanded[boxType];
        
        if (boxType === 'input') setInputBoxHeight(target);
        else if (boxType === 'output') setOutputBoxHeight(target);
        else if (boxType === 'instructions') setInstructionsBoxHeight(target);
        else if (boxType === 'glossary') setGlossaryBoxHeight(target);
        localStorage.setItem(`${boxType}BoxHeight`, target);
      };

      const renderBoxResizeBar = (boxType) => {
        const defaults = { input: 220, output: 250, instructions: 80, glossary: 140 };
        const curHeights = {
          input: inputBoxHeight,
          output: outputBoxHeight,
          instructions: instructionsBoxHeight,
          glossary: glossaryBoxHeight
        };
        const cur = curHeights[boxType] || defaults[boxType];
        const isExp = cur > (defaults[boxType] + 60);

        return h('div', {
          className: 'py-2 flex items-center justify-center cursor-row-resize touch-none group select-none',
          onPointerDown: (e) => handlePointerResizeStart(e, boxType),
          onTouchStart: (e) => handleTouchResizeStart(e, boxType),
          onDoubleClick: () => toggleBoxExpand(boxType),
          title: 'Drag to resize · double-click to expand or collapse'
        },
          h('div', { className: 'w-24 h-1.5 rounded-full transition-colors', style: { background: isExp ? 'var(--iris-deep)' : 'var(--hairline)' } })
        );
      };

// (toast is defined above)

      // --- Effects ---
      useEffect(() => {
        const toastListener = (e) => {
          if (e.detail && e.detail.msg) {
            toast(e.detail.msg, e.detail.type || 'success');
          }
        };
        window.addEventListener('app-toast', toastListener);
        return () => window.removeEventListener('app-toast', toastListener);
      }, []);

      // Deep Linking & URL Scheme Router (§10.8)
      useEffect(() => {
        const handleHashRoute = async () => {
          const hash = window.location.hash || '';
          if (!hash || !hash.includes('novel=')) return;
          try {
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const novelParam = params.get('novel');
            const chapterParam = parseInt(params.get('chapter') || '1', 10);
            if (novelParam && window.GeminiNovelDB) {
              const all = await window.GeminiNovelDB.getAllNovels();
              const target = all.find(n => n.id === novelParam || n.title === novelParam || (n.title && n.title.toLowerCase().includes(novelParam.toLowerCase())));
              if (target) {
                const full = await loadFullNovel(target);
                if (full) {
                  const chs = (full.translatedChapters && full.translatedChapters.length > 0)
                    ? full.translatedChapters
                    : (full.rawChapters || full.chapters || []);
                  if (chs.length > 0) {
                    const cleanCh = (c) => {
                      const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
                      const raw = c?.text || c?.content || '';
                      return (typeof stripFn === 'function' && c?.title) ? stripFn(raw, c.title, c.originalTitle) : raw;
                    };
                    const cleanedChs = chs.map(c => ({ title: c.title, content: cleanCh(c) }));
                    setChapters(cleanedChs);
                    const targetIdx = Math.max(0, Math.min(cleanedChs.length - 1, chapterParam - 1));
                    setReaderChapterIdx(targetIdx);
                    setReaderOpen(true);
                    toast(`🔗 Deep link routed to "${target.title}" (Ch ${targetIdx + 1})`, 'success');
                  }
                }
              }
            }
          } catch (e) {
            console.warn('[DeepLink] Routing error:', e);
          }
        };

        const timer = setTimeout(handleHashRoute, 400);
        window.addEventListener('hashchange', handleHashRoute);
        if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
          window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
            if (data?.url) {
              try {
                const u = new URL(data.url);
                if (u.hash) window.location.hash = u.hash;
              } catch (_) {}
            }
          });
        }
        return () => {
          clearTimeout(timer);
          window.removeEventListener('hashchange', handleHashRoute);
        };
      }, []);

      useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
        window.setActiveAppTab = (tab, subTab) => {
          if (tab) { setActiveTab(tab); localStorage.setItem('activeTab', tab); }
          if (subTab) { setStudioSubTab(subTab); localStorage.setItem('studioSubTab', subTab); }
        };
        if (activeTab === 'studio') {
          setTimeout(() => {
            if (studioSubTab === 'edit' && typeof window.initEpubEditor === 'function') {
              try { window.initEpubEditor(); } catch (e) { console.warn('Editor init error:', e); }
            }
            if (studioSubTab === 'split' && typeof window.initSplitter === 'function') {
              try { window.initSplitter(); } catch (e) { console.warn('Splitter init error:', e); }
            }
            if (studioSubTab === 'merge' && typeof window.initMerger === 'function') {
              try { window.initMerger(); } catch (e) { console.warn('Merger init error:', e); }
            }
          }, 40);
        }
      }, [activeTab, studioSubTab]);

      // ── Centralized Android Hardware & Edge-Swipe Back Button Handler ──
      useEffect(() => {
        let lastBackPress = 0;
        let removeListener = null;

        const handleAppBack = () => {
          // 1. Chapter Preview Mode in Edit Ebook
          if (window.isEpubEditorPreviewActive && typeof window.exitEpubEditorPreview === 'function') {
            window.exitEpubEditorPreview();
            return true;
          }

          // 2. Unsaved confirmation dialog in Edit Ebook
          const unsaved = document.getElementById('edit-unsaved-confirm-modal');
          if (unsaved && !unsaved.classList.contains('hidden')) {
            unsaved.classList.add('hidden');
            return true;
          }

          // 3. Move & Hierarchy Sheet in Edit Ebook
          const moveModal = document.getElementById('edit-move-chapter-modal');
          if (moveModal && !moveModal.classList.contains('hidden')) {
            moveModal.classList.add('hidden');
            return true;
          }

          // 4. Rename Chapter Modal in Edit Ebook
          const renModal = document.getElementById('edit-rename-modal');
          if (renModal && !renModal.classList.contains('hidden')) {
            renModal.classList.add('hidden');
            return true;
          }

          // 5. Chapter Edit Prose Modal in Edit Ebook
          const chModal = document.getElementById('edit-chapter-modal');
          if (chModal && !chModal.classList.contains('hidden')) {
            if (window.isEpubEditorPreviewActive && typeof window.exitEpubEditorPreview === 'function') {
              window.exitEpubEditorPreview();
              return true;
            }
            if (typeof window.requestCloseChapterModal === 'function') {
              window.requestCloseChapterModal();
            } else {
              chModal.classList.add('hidden');
            }
            return true;
          }

          // 6. Other Studio Modals (Gallery Lightbox, Gallery, Find & Replace, Auto-Number, Library)
          const galLightbox = document.getElementById('edit-gallery-lightbox');
          if (galLightbox && (galLightbox.style.display === 'flex' || !galLightbox.classList.contains('hidden'))) {
            if (typeof window.closeGalleryLightbox === 'function') {
              window.closeGalleryLightbox();
            } else {
              galLightbox.style.display = 'none';
              galLightbox.classList.add('hidden');
            }
            return true;
          }
          const galModal = document.getElementById('edit-gallery-modal');
          if (galModal && (galModal.style.display === 'flex' || !galModal.classList.contains('hidden'))) {
            if (typeof window.closeGalleryModal === 'function') {
              window.closeGalleryModal();
            } else {
              galModal.style.display = 'none';
              galModal.classList.add('hidden');
            }
            return true;
          }
          const frModal = document.getElementById('edit-find-replace-modal');
          if (frModal && !frModal.classList.contains('hidden')) {
            frModal.classList.add('hidden');
            return true;
          }
          const anModal = document.getElementById('edit-autonumber-modal');
          if (anModal && !anModal.classList.contains('hidden')) {
            anModal.classList.add('hidden');
            return true;
          }
          const libModal = document.getElementById('edit-library-modal');
          if (libModal && !libModal.classList.contains('hidden')) {
            libModal.classList.add('hidden');
            return true;
          }

          // 7. React App Modals & Overlays
          if (ongoingEpubModal && ongoingEpubModal.isOpen) {
            if (!ongoingEpubModal.isFetching) setOngoingEpubModal(null);
            return true;
          }
          if (readerOpen) {
            setReaderOpen(false);
            return true;
          }
          if (activeNovelView) {
            setActiveNovelView(null);
            return true;
          }
          if (audioDownloadModal) {
            setAudioDownloadModal(null);
            return true;
          }
          if (costEstimatorModalOpen) {
            setCostEstimatorModalOpen(false);
            return true;
          }
          if (epubPackagingModal) {
            setEpubPackagingModal(null);
            return true;
          }
          if (typeof renameModalNovel !== 'undefined' && renameModalNovel) {
            setRenameModalNovel(null);
            return true;
          }

          // 8. Secondary Tab -> Return to Library or Translate
          if (activeTab === 'studio' || activeTab === 'web_importer' || activeTab === 'settings') {
            setActiveTab('history');
            localStorage.setItem('activeTab', 'history');
            return true;
          }

          // 9. Root Level -> Double-tap within 2s to exit app
          const now = Date.now();
          if (now - lastBackPress < 2000) {
            if (window.Capacitor?.Plugins?.App?.exitApp) {
              window.Capacitor.Plugins.App.exitApp();
            }
          } else {
            lastBackPress = now;
            toast('Press back again to exit', 'info');
          }
          return true;
        };

        if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.App) {
          window.Capacitor.Plugins.App.addListener('backButton', () => {
            handleAppBack();
          }).then(h => {
            removeListener = h;
          }).catch(() => {});
        }

        return () => {
          if (removeListener && typeof removeListener.remove === 'function') {
            removeListener.remove();
          }
        };
      }, [ongoingEpubModal, readerOpen, activeNovelView, audioDownloadModal, costEstimatorModalOpen, epubPackagingModal, typeof renameModalNovel !== 'undefined' ? renameModalNovel : null, activeTab]);

      useEffect(() => { document.documentElement.classList.add('dark'); localStorage.setItem('darkMode', 'true'); }, []);
      useEffect(() => { localStorage.setItem('enableStreaming', String(enableStreaming)) }, [enableStreaming]);
      useEffect(() => { localStorage.setItem('translationProvider', provider) }, [provider]);
      useEffect(() => { localStorage.setItem('concurrency', String(concurrency)) }, [concurrency]);
      useEffect(() => { localStorage.setItem('contextAware', String(contextAware)) }, [contextAware]);
      useEffect(() => { localStorage.setItem('chunkSizePreset', chunkSizePreset) }, [chunkSizePreset]);

      useEffect(() => {
        if (isTranslating || isTranslationPaused) return;
        if (!inputText && !currentFileHash) {
          if (!savedTranslationSession) {
            setActiveSession(null);
            activeSessionRef.current = null;
          }
          return;
        }
        const id = inputText ? generateJobId(inputText) : currentFileHash;
        const saved = localStorage.getItem(id);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            activeSessionRef.current = parsed;
            setActiveSession(parsed);
            if (parsed.result) {
              setAssembledText(parsed.result);
            } else if (parsed.allParts && Array.isArray(parsed.allParts)) {
              setAssembledText(parsed.allParts.filter(Boolean).join('\n\n\n').trim());
            }
            if (parsed.newChapters && Array.isArray(parsed.newChapters)) {
              setTranslatedChapters(parsed.newChapters);
            }
          } catch(e) {}
        } else {
          if (!savedTranslationSession) {
            setActiveSession(null);
            activeSessionRef.current = null;
          }
        }
      }, [inputText, currentFileHash, provider, contextAware]);

      useEffect(() => {
        const localG = JSON.parse(localStorage.getItem('savedGlossaries') || '[]');
        setSavedGlossaries(localG);
        const localH = JSON.parse(localStorage.getItem('translationHistory') || '[]');
        setHistory(localH);
        
        const dg = localStorage.getItem('defaultGlossaryName');
        if (dg) {
          setDefaultGlossaryName(dg);
        }

        // Async IndexedDB hydration & auto-migration
        (async () => {
          try {
            const dbHist = await dbGetAll('history');
            if (dbHist && dbHist.length > 0) {
              const sorted = dbHist.sort((a, b) => new Date(b.ts) - new Date(a.ts));
              setHistory(sorted);
            } else if (localH && localH.length > 0) {
              for (const item of localH) {
                await dbPut('history', item);
              }
            }

            const dbGloss = await dbGetAll('glossaries');
            const currentLocalG = JSON.parse(localStorage.getItem('savedGlossaries') || '[]');
            const gMap = new Map();
            (dbGloss || []).forEach(g => { if (g && g.name) gMap.set(g.name, g); });
            currentLocalG.forEach(g => { if (g && g.name) gMap.set(g.name, g); });
            const mergedG = Array.from(gMap.values());
            if (mergedG.length > 0) {
              setSavedGlossaries(mergedG);
              localStorage.setItem('savedGlossaries', JSON.stringify(mergedG));
              for (const gItem of mergedG) {
                await dbPut('glossaries', gItem);
              }
            }
          } catch (e) {
            console.warn('IndexedDB initial sync note:', e);
          }
        })();

        initAppWorker();
        if (typeof window.pdfjsLib !== 'undefined') window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      }, []);

      useEffect(() => {
        if (geminiKey) {
          fetchGeminiModels(geminiKey).then(m => {
            setAvailableModels(m);
            if (m.length && !m.find(x => x.id === geminiModel) && !useCustomModel) {
              const preferred = m.find(x => x.id.includes('3.7-flash')) || m.find(x => x.id.includes('3.6-flash')) || m.find(x => x.id.includes('3.5-flash')) || m.find(x => x.id.includes('3.1-flash-lite')) || m[0];
              if (preferred) setGeminiModel(preferred.id);
            }
          }).catch(() => { });
        }
      }, [apiKeysByProvider.gemini, activeKeyIds.gemini]);

      // Keyboard shortcuts
      useEffect(() => {
        const handler = e => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!isTranslating) handleStartTranslation();
          }
          if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            if (assembledText) copyText(assembledText).then(() => toast('Copied!')).catch(() => { });
          }
          if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            const currentDisplay = assembledText || (translatedChapters || []).filter(Boolean).map(c => `${c?.title || ''}\n\n${c?.content || c?.text || ''}`).join('\n\n\n').trim();
            if (currentDisplay) setReaderOpen(prev => !prev);
          }
          if (e.key === 'Escape') {
            if (readerOpen) setReaderOpen(false);
            if (showModal) setShowModal(false);
          }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }, [isTranslating, assembledText, translatedChapters, readerOpen, showModal]);

      // --- API Key Handlers ---
      // (legacy single-key handlers removed — multi-key profiles replace them)

      // --- Profile/Glossary Handlers ---
      const handleSaveGlossary = async (targetName = null) => {
        let name = (targetName || newGlossaryName || activeGlossaryId || '').trim();
        if (!name) {
          const prompted = prompt('Enter a name for this glossary profile:');
          if (!prompted || !prompted.trim()) return;
          name = prompted.trim();
        }
        if (!terminology.trim() && !customInstructions.trim()) return setError('Profile content is empty.');
        const existing = savedGlossaries.findIndex(g => g.name === name);
        const updatedEntry = { name, content: terminology, instructions: customInstructions };
        let u;
        if (existing > -1) {
          u = [...savedGlossaries];
          u[existing] = updatedEntry;
        } else {
          u = [...savedGlossaries, updatedEntry];
        }
        setSavedGlossaries(u);
        localStorage.setItem('savedGlossaries', JSON.stringify(u));
        localStorage.setItem('terminology', terminology);
        localStorage.setItem('customInstructions', customInstructions);
        try { await dbPut('glossaries', updatedEntry); } catch(e) {}
        setNewGlossaryName('');
        setActiveGlossaryId(name);
        localStorage.setItem('activeGlossaryId', name);
        setError('');
        toast(`Profile "${name}" saved!`, 'success');
      };

      const handleLoadGlossary = g => {
        setTerminology(g.content || '');
        setCustomInstructions(g.instructions || '');
        setActiveGlossaryId(g.name);
        localStorage.setItem('activeGlossaryId', g.name);
        localStorage.setItem('terminology', g.content || '');
        localStorage.setItem('customInstructions', g.instructions || '');
        toast(`Loaded "${g.name}"`);
      };

      const checkAndApplyNovelGlossary = (novelRecord) => {
        if (!novelRecord) return;
        if (novelRecord.glossaryProfile) {
          const match = savedGlossaries.find(g => g.name === novelRecord.glossaryProfile);
          if (match) {
            handleLoadGlossary(match);
            return;
          }
        }
        if (novelRecord.glossary && (!terminology || !terminology.trim())) {
          setTerminology(novelRecord.glossary);
          localStorage.setItem('terminology', novelRecord.glossary);
          const profName = novelRecord.glossaryProfile || `${novelRecord.title || 'Novel'} Glossary`;
          setActiveGlossaryId(profName);
          localStorage.setItem('activeGlossaryId', profName);
          toast(`Loaded bound glossary for "${novelRecord.title || 'Novel'}"!`, 'info');
        }
      };

      const handleUnloadGlossary = () => {
        setTerminology('');
        setActiveGlossaryId(null);
        localStorage.removeItem('terminology');
        localStorage.removeItem('activeGlossaryId');
        toast('Profile unloaded and glossary text cleared.', 'info');
      };

      const handleDeleteGlossary = n => {
        confirmAction(`Delete profile "${n}"?`, async () => {
          const u = savedGlossaries.filter(g => g.name !== n);
          setSavedGlossaries(u);
          localStorage.setItem('savedGlossaries', JSON.stringify(u));
          try { await dbDelete('glossaries', n); } catch(e) {}
          if (activeGlossaryId === n) {
            setActiveGlossaryId(null);
            setTerminology('');
            localStorage.removeItem('activeGlossaryId');
            localStorage.removeItem('terminology');
          }
          if (defaultGlossaryName === n) {
            localStorage.removeItem('defaultGlossaryName');
            setDefaultGlossaryName(null);
          }
          toast('Profile deleted.', 'info');
        });
      };

      const handleUpdateGlossary = async n => {
        const i = savedGlossaries.findIndex(g => g.name === n);
        if (i > -1) {
          const updatedEntry = { name: n, content: terminology, instructions: customInstructions };
          const u = [...savedGlossaries];
          u[i] = updatedEntry;
          setSavedGlossaries(u);
          localStorage.setItem('savedGlossaries', JSON.stringify(u));
          localStorage.setItem('terminology', terminology);
          localStorage.setItem('customInstructions', customInstructions);
          setActiveGlossaryId(n);
          localStorage.setItem('activeGlossaryId', n);
          try { await dbPut('glossaries', updatedEntry); } catch(e) {}
          toast(`Saved changes to "${n}"!`);
        } else {
          // If not found in list, save as new
          const updatedEntry = { name: n, content: terminology, instructions: customInstructions };
          const u = [...savedGlossaries, updatedEntry];
          setSavedGlossaries(u);
          localStorage.setItem('savedGlossaries', JSON.stringify(u));
          setActiveGlossaryId(n);
          localStorage.setItem('activeGlossaryId', n);
          try { await dbPut('glossaries', updatedEntry); } catch(e) {}
          toast(`Created and saved "${n}"!`);
        }
      };

      const handleRenameGlossary = (oldName) => {
        const newName = window.prompt(`Enter new name for profile "${oldName}":`, oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        const trimmed = newName.trim();
        if (savedGlossaries.some(g => g.name === trimmed)) {
          return setError(`A profile named "${trimmed}" already exists.`);
        }
        const u = savedGlossaries.map(g => g.name === oldName ? { ...g, name: trimmed } : g);
        setSavedGlossaries(u);
        localStorage.setItem('savedGlossaries', JSON.stringify(u));
        try { dbDelete('glossaries', oldName); } catch(e) {}
        const renamed = u.find(g => g.name === trimmed);
        if (renamed) {
          try { dbPut('glossaries', renamed); } catch(e) {}
        }
        if (activeGlossaryId === oldName) {
          setActiveGlossaryId(trimmed);
          localStorage.setItem('activeGlossaryId', trimmed);
        }
        if (defaultGlossaryName === oldName) {
          setDefaultGlossaryName(trimmed);
          localStorage.setItem('defaultGlossaryName', trimmed);
        }
        toast(`Profile renamed to "${trimmed}"!`);
      };

      const handleUnlinkGlossary = () => {
        setActiveGlossaryId(null);
        localStorage.removeItem('activeGlossaryId');
        toast('Unlinked active profile.', 'info');
      };

      const setDefaultGloss = () => { if (!activeGlossaryId) return setError('Load a profile first.'); localStorage.setItem('defaultGlossaryName', activeGlossaryId); setDefaultGlossaryName(activeGlossaryId); toast(`"${activeGlossaryId}" set as default!`) };
      const clearDefaultGloss = () => { confirmAction('Clear default profile?', () => { localStorage.removeItem('defaultGlossaryName'); setDefaultGlossaryName(null); toast('Default cleared.', 'info') }) };
      const exportGlossaries = async () => { try { const blob = new Blob([JSON.stringify(savedGlossaries, null, 2)], { type: 'application/json' }); await saveUniversalBlob(blob, 'glossaries_backup.json', 'application/json'); toast('Glossaries exported!', 'success'); } catch (e) { toast('Export error: ' + e.message, 'error'); } };
      const importGlossaries = async e => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const txt = await f.text();
          const data = JSON.parse(txt);
          if (!Array.isArray(data) || data.length === 0) throw new Error('Glossary file is empty or invalid format.');
          const merged = [...savedGlossaries];
          let added = 0;
          data.forEach(g => {
            if (g.name && g.content && !merged.find(x => x.name === g.name)) {
              merged.push(g);
              added++;
            }
          });
          setSavedGlossaries(merged);
          localStorage.setItem('savedGlossaries', JSON.stringify(merged));
          toast(`Imported ${added} new glossaries (${data.length} total)!`, 'success');
        } catch (err) {
          setError('Invalid glossary file: ' + err.message);
          toast('Invalid glossary file: ' + err.message, 'error');
        }
        e.target.value = '';
      };
      const handleGlossaryFile = async e => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const txt = await f.text();
          if (!txt || !txt.trim()) throw new Error('Selected glossary file is empty.');
          setTerminology(txt);
          localStorage.setItem('terminology', txt);
          setNewGlossaryName(f.name.replace(/\.[^.]+$/, ''));
          toast(`Glossary loaded from ${f.name}`, 'success');
        } catch (err) {
          setError('Failed to read file: ' + err.message);
          toast('Failed to read file: ' + err.message, 'error');
        }
        e.target.value = '';
      };

      const applyGlossaryPreset = (type) => {
        const presets = window.GLOSSARY_PRESETS || {};
        const selected = presets[type];
        if (selected) {
          if (type === 'literary' || type === 'dialogue') {
            setCustomInstructions(p => {
              const next = p ? `${p}\n${selected}` : selected;
              localStorage.setItem('customInstructions', next);
              return next;
            });
            toast(`Added ${type} instructions!`);
          } else {
            setTerminology(p => {
              const next = p ? `${p}\n\n${selected}` : selected;
              localStorage.setItem('terminology', next);
              return next;
            });
            toast(`Added ${type} terminology!`);
          }
        }
      };

      const formatGlossaryContent = () => {
        if (!terminology.trim()) {
          toast('Glossary is empty.', 'warning');
          return setError('Glossary is empty.');
        }
        const formatted = formatGlossaryString(terminology);
        setTerminology(formatted);
        localStorage.setItem('terminology', formatted);
        toast('Glossary formatted cleanly!', 'success');
      };

      const exportGlossaryTxt = async () => {
        if (!terminology.trim()) {
          toast('Glossary is empty. Add terms before exporting.', 'warning');
          return setError('Glossary is empty.');
        }
        const blob = new Blob([terminology], { type: 'text/plain;charset=utf-8' });
        const exportFileName = (activeGlossaryId ? activeGlossaryId.replace(/\s+/g, '_') : 'glossary_export') + '.txt';
        try {
          await saveUniversalBlob(blob, exportFileName, 'text/plain');
          toast('Glossary exported to Downloads as .txt!', 'success');
        } catch(e) {
          toast('Export error: ' + e.message, 'error');
        }
      };

      const copyAiGlossaryPrompt = () => {
        const prompt = `You are an expert literary localization editor and terminology engineer.
Organize, standardize, clean up, and optimize raw glossary notes, character lists, or novel wiki notes into a standardized Master Glossary file for a translation engine.

FORMATTING & STRUCTURE RULES:
1. NO TOKEN-WASTING DIVIDERS (do not use === or --- lines). Use clean section numbers (I., II., III.) and blank lines.
2. SECTION BREAKDOWN:
   I. SYSTEM TRANSLATION RULES & STYLE GUIDELINES (Global rules, tone, pronoun conventions like 祂 -> "He", formatting preservation)
   II. CORE CONCEPTS & SYSTEM TERMS (Cultivation ranks, power systems, currencies, realms)
   III. CHARACTER & FACTION DIRECTORY
   IV. ABILITIES, ARTIFACTS, ITEMS & TECHNIQUES
   V. GEOGRAPHY & LOCATIONS
3. STANDARD SYNTAX FOR ENTRIES:
   Format every term strictly as:
   - [Original Language Source Key] -> [English Translation] ([Optional Lore, Notes, or Alias])
   Always put the original language characters (Chinese/Korean/Japanese) on the LEFT side of ->.
   FOR ALL CHARACTERS IN SECTION III: Always explicitly append their gender: (female), (male), or [context] (for gender-fluid, shifting, or dynamic forms).
   Example:
   - 休·迪尔查 -> Xio Derecha (female)
   - 克莱恩·莫雷蒂 -> Klein Moretti (male)
   - 特莉丝 -> Trissy [context]
4. LOSSLESS REQUIREMENT: Do not delete, omit, summarize, deduplicate, merge, paraphrase, or silently correct any original rule, term, alias, note, example, heading, section, or line. Preserve every original fact and its ordering. You may add searchable aliases or index lines, but additions must be clearly additive and must never replace the original text.
5. Keep all original content even when it appears repetitive or belongs to another series; the translation engine's dynamic selector decides what to use per source chunk.
6. Output ONLY the lossless plaintext glossary content. No meta-commentary.

---
RAW GLOSSARY DATA TO CLEAN:
[PASTE YOUR RAW NOTES HERE]`;

        copyText(prompt).then(() => toast('AI Optimizer Prompt copied to clipboard!'));
      };

      const splitGlossaryIntoChunks = (text, maxLines = 130) => {
        const lines = text.split(/\r?\n/);
        if (lines.length <= maxLines) return [text];
        const chunks = [];
        let cur = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const isHeader = /^(?:#+\s*)?(?:SECTION\s+)?[IVXLCDM]+\.\s+/i.test(line) || /^#{1,2}\s+[A-Z]/i.test(line);
          if (cur.length >= maxLines && (line.trim() === '' || isHeader)) {
            chunks.push(cur.join('\n'));
            cur = [];
          } else if (cur.length >= maxLines * 1.5) {
            chunks.push(cur.join('\n'));
            cur = [];
          }
          cur.push(line);
        }
        if (cur.length > 0) chunks.push(cur.join('\n'));
        return chunks;
      };

      const handleAiOptimizeGlossary = async () => {
        if (!terminology.trim()) return setError('Enter or paste some glossary notes/text first to optimize.');
        const key = getActiveApiKey(provider);
        if (!key) return setError(`Please enter your ${provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} API key in Settings.`);

        const chunks = splitGlossaryIntoChunks(terminology, 130);
        const totalChunks = chunks.length;

        if (totalChunks > 1) {
          const proceed = window.confirm(
            `⚡ Lossless Section Optimizer (${Math.round(terminology.length / 1000)}k chars, ${terminology.split('\n').length} lines):\n\n` +
            `This glossary will be optimized across ${totalChunks} discrete sections to guarantee 0% truncation and 100% preservation of all terms against API output token limits.\n\n` +
            `Proceed with lossless AI optimization?`
          );
          if (!proceed) return;
        }

        setIsOptimizingGlossary(true);
        setError('');
        toast(totalChunks > 1 ? `Starting lossless AI optimization across ${totalChunks} sections...` : 'Optimizing glossary with AI...', 'info');

        const systemPrompt = `You are an expert literary localization editor and terminology engineer.
Your task is to organize, standardize, clean up, and optimize raw glossary notes, character lists, or wiki dumps into a standardized Master Glossary for a translation engine.

FORMATTING & STRUCTURE RULES:
1. NO TOKEN-WASTING DIVIDERS (do not use === or --- lines).
2. PRESERVE ALL SECTION HEADINGS (e.g. "I. SYSTEM TRANSLATION RULES...", "II. CORE CONCEPTS...", "III. CHARACTER DIRECTORY...").
3. STANDARD SYNTAX FOR ENTRIES:
   - Format entries strictly as:
     - [Original Language Source Key] -> [English Translation] ([Optional Lore / Alias / Context])
   - Always put the original language characters (Chinese/Korean/Japanese) on the LEFT side of ->.
   - FOR ALL CHARACTERS: Always explicitly append their gender: (female), (male), or [context] (for gender-fluid, shifting, or dynamic forms).
     Example:
     - 休·迪尔查 -> Xio Derecha (female)
     - 克莱恩·莫雷蒂 -> Klein Moretti (male)
     - 特莉丝 -> Trissy [context]
4. STRICT LOSSLESS REQUIREMENT: Never delete, omit, summarize, deduplicate, merge, paraphrase, or truncate any original rule, term, alias, note, example, heading, section, or line. Preserve every original fact and its ordering. Add searchable aliases or index lines only when additive; never replace source text.
5. Keep all original content even when it appears repetitive or belongs to another series; dynamic selection handles relevance during translation.
6. Output ONLY the lossless plaintext glossary content for this section. No conversational opening, explanations, or closing chatter.`;

        const optimizeSingleChunk = async (chunk, idx, total) => {
          const userPrompt = total > 1
            ? `Please format and optimize Part ${idx + 1} of ${total} of this glossary. Preserve EVERY entry, character, rule, and note losslessly without truncation:\n\n${chunk}`
            : `Please optimize, structure, and format the following glossary data losslessly:\n\n${chunk}`;

          if (provider === 'deepseek') {
            const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
              body: JSON.stringify({
                model: useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : 'deepseek-reasoner',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                stream: false
              })
            });
            if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`DeepSeek API error ${r.status}: ${b.substring(0, 150)}`); }
            const j = await r.json();
            return j.choices?.[0]?.message?.content || '';
          } else {
            const model = useCustomModel && customModel ? customModel : geminiModel;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const r = await fetchRetry(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 8192,
                  thinkingConfig: { thinkingBudget: 1024 }
                }
              })
            });
            if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`Gemini API error ${r.status}: ${b.substring(0, 150)}`); }
            const j = await r.json();
            const finishReason = j?.candidates?.[0]?.finishReason;
            if (finishReason === 'MAX_TOKENS') {
              console.warn(`Chunk ${idx + 1} reached MAX_TOKENS, falling back to original chunk to prevent data loss.`);
              return chunk;
            }
            const candidateParts = j?.candidates?.[0]?.content?.parts || [];
            const actualParts = candidateParts.filter(p => !p.thought);
            const text = actualParts.length > 0
              ? actualParts.map(p => p.text || '').join('')
              : (candidateParts.map(p => p.text || '').join(''));
            return text || '';
          }
        };

        try {
          const optimizedParts = [];
          for (let i = 0; i < totalChunks; i++) {
            if (totalChunks > 1) {
              toast(`Optimizing section ${i + 1}/${totalChunks} (100% lossless)...`, 'info');
            }
            let res = '';
            try {
              res = await optimizeSingleChunk(chunks[i], i, totalChunks);
            } catch (chunkErr) {
              console.warn(`Chunk ${i + 1} failed:`, chunkErr);
              res = chunks[i];
            }

            if (!res || (res.length < chunks[i].length * 0.4 && chunks[i].length > 300)) {
              console.warn(`Chunk ${i + 1} output truncated or empty, preserving original chunk.`);
              res = chunks[i];
            }
            optimizedParts.push(res.trim());
          }

          const finalResult = optimizedParts.join('\n\n');
          if (!finalResult.trim()) throw new Error('Received empty response from AI.');

          setTerminology(finalResult.trim());
          toast(`Glossary successfully cleaned and structured (${totalChunks} section${totalChunks > 1 ? 's' : ''}, 100% lossless)!`, 'success');
          window.telemetryLog?.('AI_OPTIMIZE', `Losslessly optimized glossary across ${totalChunks} chunk(s) (${finalResult.split('\n').length} lines).`);
        } catch (err) {
          setError('AI Glossary Optimization failed: ' + err.message);
        } finally {
          setIsOptimizingGlossary(false);
        }
      };

      // --- AI Auto-Glossary & Character Extractor Engine ---
      const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const callAiAnalysis = async (prompt, systemInstruction = '', modelOverride = null, providerOverride = null) => {
        const prov = providerOverride || (modelOverride && modelOverride.startsWith('deepseek') ? 'deepseek' : (provider || 'gemini'));
        let allKeys = [];
        try {
          const stored = JSON.parse(localStorage.getItem('apiKeysByProvider') || '{}');
          allKeys = (stored[prov] || []).map(p => p.key).filter(Boolean);
        } catch (e) {}
        if (allKeys.length === 0) {
          const single = localStorage.getItem(`${prov}ApiKey`) || (prov === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
          if (single) allKeys.push(single);
        }
        if (allKeys.length === 0) throw new Error(`Please configure an API key for ${prov.toUpperCase()} in Settings.`);

        let key = allKeys[0];
        if (prov === 'deepseek') {
          const m = modelOverride || (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : 'deepseek-chat');
          const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: m,
              messages: [
                ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
                { role: 'user', content: prompt }
              ],
              stream: false
            })
          });
          if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`DeepSeek error ${r.status}: ${b.substring(0, 120)}`); }
          const j = await r.json();
          return j.choices?.[0]?.message?.content || '';
        } else {
          const activeM = modelOverride || (useCustomModel && customModel ? customModel : (geminiModel || 'gemini-3.5-flash-lite'));
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeM}:generateContent?key=${key}`;
          const bodyPayload = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
          };
          if (systemInstruction) {
            bodyPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
          }
          const r = await fetchRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
          });
          if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`Gemini error ${r.status}: ${b.substring(0, 120)}`); }
          const j = await r.json();
          const candidateParts = j?.candidates?.[0]?.content?.parts || [];
          const actualParts = candidateParts.filter(p => !p.thought);
          return actualParts.length > 0 ? actualParts.map(p => p.text || '').join('') : candidateParts.map(p => p.text || '').join('');
        }
      };

      const handleOpenAutoGlossary = (targetNovel = null) => {
        setAutoGlossaryTargetNovel(targetNovel);
        const targetChs = targetNovel?.chapters || targetNovel?.rawChapters || chapters || [];
        const maxCh = (targetChs && targetChs.length > 0) ? targetChs.length : 1;
        setAutoGlossaryChapterCount(Math.min(5, maxCh));
        setExtractedTerms([]);
        setAutoGlossaryModalOpen(true);
      };

      const handleExtractGlossary = async () => {
        const targetChs = autoGlossaryTargetNovel?.chapters || autoGlossaryTargetNovel?.rawChapters || chapters || [];
        let sampleText = '';
        if (targetChs && targetChs.length > 0) {
          const count = Math.min(autoGlossaryChapterCount, targetChs.length);
          for (let i = 0; i < count; i++) {
            const c = targetChs[i];
            const title = (typeof c === 'object' && c?.title) ? c.title : `Chapter ${i + 1}`;
            const txt = (typeof c === 'string' ? c : (c?.text || c?.content || '')).slice(0, 4000);
            sampleText += `\n--- ${title} ---\n${txt}\n`;
          }
        } else if (inputText && inputText.trim()) {
          sampleText = inputText.slice(0, 16000);
        } else {
          return toast('Please load a novel or enter text in the translate box first', 'warning');
        }

        setIsExtractingGlossary(true);
        window.telemetryLog?.('AUTO_GLOSSARY', `Started AI glossary extraction with ${sampleText.length} chars of novel text sample.`);
        try {
          const sysPrompt = `You are an expert light novel and web novel translator and editor.
Analyze the provided novel chapter excerpts and extract:
1. Character names (protagonists, side characters, villains, titles, aliases) with verified gender
2. Factions, sects, guilds, schools, academies, or family clans
3. Special fantasy terminology, cultivation ranks, magical skills, or key locations

For each entity, output a single line in this exact format:
- OriginalTerm = TranslatedTerm # Category: Note

For characters, explicitly specify their gender in the Category tag if known from context, pronouns, or honorifics:
- Character (male)
- Character (female)

If a character or term has aliases, multiple names, or honorific forms, include them separated by slashes on the left and right sides so the Smart Glossary matches all variations:
Examples:
- 綾小路 清隆 / 綾小路 = Kiyotaka Ayanokouji / Kiyo # Character (male): Main protagonist, Class D
- 堀北 鈴音 = Suzune Horikita # Character (female): Class D leader
- 高度育成高等学校 = Advanced Nurturing High School # Location: Main setting
- 鬼道 / 破道 = Kido / Hado # Skill: Soul Reaper incantation magic

Output ONLY the glossary lines starting with a hyphen. Do not wrap in markdown code blocks or add conversational chatter.`;

          const raw = await callAiAnalysis(`NOVEL TEXT EXCERPTS:\n${sampleText}`, sysPrompt);
          const parsed = [];
          const lines = raw.split(/\r?\n/);
          lines.forEach((line, idx) => {
            line = line.trim();
            if (!line || line.startsWith('//') || line.startsWith('/*')) return;
            line = line.replace(/^[-*•\s]+/, '').trim();
            const match = line.match(/^(.*?)\s*(?:->|=>|=)\s*(.*?)$/);
            if (match) {
              const orig = match[1].trim();
              let rest = match[2].trim();
              let cat = 'Character';
              let note = '';
              const hashIdx = rest.indexOf('#');
              if (hashIdx !== -1) {
                const comment = rest.slice(hashIdx + 1).trim();
                rest = rest.slice(0, hashIdx).trim();
                const colIdx = comment.indexOf(':');
                if (colIdx !== -1) {
                  cat = comment.slice(0, colIdx).trim();
                  note = comment.slice(colIdx + 1).trim();
                } else {
                  cat = comment;
                }
              }
              let gen = null;
              if (/\b(?:female|f)\b/i.test(cat)) gen = 'female';
              else if (/\b(?:male|m)\b/i.test(cat)) gen = 'male';
              if (orig && rest) {
                parsed.push({ id: 'term_' + idx, orig, trans: rest, category: cat || 'Entity', gender: gen, note, checked: true });
              }
            }
          });

          if (parsed.length === 0) {
            toast('No terms identified. Try increasing chapter count or check chapter content.', 'info');
            window.telemetryLog?.('AUTO_GLOSSARY', 'No terms identified from novel sample.');
          } else {
            setExtractedTerms(parsed);
            toast(`Extracted ${parsed.length} terms from novel!`, 'success');
            window.telemetryLog?.('AUTO_GLOSSARY', `Successfully extracted ${parsed.length} terms from novel!`, { termCount: parsed.length });
            try { window.NativeBridge?.showCompletionNotification?.('AI Glossary Extracted! ⚡', `Discovered ${parsed.length} character names and lore terms.`); } catch(e) {}
          }
        } catch (err) {
          console.error('Auto-glossary extraction error:', err);
          window.telemetryLog?.('AUTO_GLOSSARY', `Extraction failed: ${err.message}`, null, 'error');
          toast('Extraction failed: ' + err.message, 'error');
        } finally {
          setIsExtractingGlossary(false);
        }
      };

      const formatExtractedTermsIntoMasterGlossary = (terms) => {
        const characters = [];
        const factions = [];
        const termsList = [];
        const locations = [];
        const other = [];

        terms.forEach(t => {
          const cat = (t.category || '').toLowerCase();
          const line = `- ${t.orig} = ${t.trans}${t.note ? ` # ${t.category}: ${t.note}` : ''}`;
          if (cat.includes('char') || cat.includes('person') || cat.includes('protagonist') || cat.includes('antagonist')) {
            characters.push(line);
          } else if (cat.includes('faction') || cat.includes('sect') || cat.includes('guild') || cat.includes('clan') || cat.includes('org')) {
            factions.push(line);
          } else if (cat.includes('loc') || cat.includes('place') || cat.includes('city') || cat.includes('realm') || cat.includes('world') || cat.includes('school')) {
            locations.push(line);
          } else if (cat.includes('rank') || cat.includes('skill') || cat.includes('item') || cat.includes('term') || cat.includes('magic') || cat.includes('artifact')) {
            termsList.push(line);
          } else {
            other.push(line);
          }
        });

        const sections = [
          '## I. SYSTEM TRANSLATION RULES & STYLE GUIDELINES',
          '- Maintain strict character gender continuity and pronoun fidelity across all chapters.',
          '- Preserve original Japanese/Chinese honorifics (-san, -kun, -sama, Shixiong, Shidi) where appropriate, or translate consistently.',
          '- Keep specialized cultivation, magical techniques, and artifact names consistent with this glossary.',
          '- Retain raw untranslated text structure, dialog formatting, and paragraph line breaks without omitting sentences.'
        ];

        let sectionNum = 2;
        const roman = ['II', 'III', 'IV', 'V', 'VI'];

        if (characters.length > 0 || factions.length > 0) {
          sections.push('', `## ${roman[sectionNum - 2]}. CHARACTER & FACTION DIRECTORY`);
          if (characters.length > 0) sections.push(...characters);
          if (factions.length > 0) sections.push('', '### Factions & Organizations', ...factions);
          sectionNum++;
        }

        if (termsList.length > 0) {
          sections.push('', `## ${roman[sectionNum - 2]}. CORE CONCEPTS & SYSTEM TERMS`);
          sections.push(...termsList);
          sectionNum++;
        }

        if (locations.length > 0) {
          sections.push('', `## ${roman[sectionNum - 2]}. LOCATIONS & GEOGRAPHY`);
          sections.push(...locations);
          sectionNum++;
        }

        if (other.length > 0) {
          sections.push('', `## ${roman[sectionNum - 2]}. ADDITIONAL ENTITIES & TERMINOLOGY`);
          sections.push(...other);
        }

        return sections.join('\n');
      };

      const handleApplyExtractedTerms = async (asNewProfile = false) => {
        const selected = extractedTerms.filter(t => t.checked);
        if (selected.length === 0) return toast('No terms selected', 'warning');
        
        // Auto-register verified character genders directly into genderLocks!
        let autoLockedCount = 0;
        const updatedLocks = { ...genderLocks };
        selected.forEach(t => {
          const gen = t.gender || (/\b(?:female|f)\b/i.test(t.category) ? 'female' : (/\b(?:male|m)\b/i.test(t.category) ? 'male' : null));
          if (gen) {
            if (t.trans) {
              t.trans.split(/[/|,]/).map(x => x.trim()).filter(Boolean).forEach(alias => {
                updatedLocks[alias] = gen;
              });
            }
            if (t.orig && t.orig !== t.trans) {
              t.orig.split(/[/|,]/).map(x => x.trim()).filter(Boolean).forEach(alias => {
                updatedLocks[alias] = gen;
              });
            }
            autoLockedCount++;
          }
        });
        if (autoLockedCount > 0) {
          setGenderLocks(updatedLocks);
          try { localStorage.setItem('gemini_gender_locks', JSON.stringify(updatedLocks)); } catch(e) {}
          const lockedList = selected
            .filter(t => t.gender || (/\b(?:female|f)\b/i.test(t.category)) || (/\b(?:male|m)\b/i.test(t.category)))
            .map(t => `${t.trans || t.orig} [${(t.gender || (/\b(?:female|f)\b/i.test(t.category) ? 'female' : 'male')).toUpperCase()}]`);
          window.telemetryLog?.('GENDER_LOCK', `Auto-locked ${autoLockedCount} character genders from extracted terms!`, {
            autoLockedCount,
            lockedCharacters: lockedList,
            totalActiveLocks: Object.keys(updatedLocks).length
          });
        }

        const structuredGlossary = formatExtractedTermsIntoMasterGlossary(selected);
        const formattedLines = selected.map(t => `- ${t.orig} = ${t.trans}${t.note ? ` # ${t.category}: ${t.note}` : ''}`).join('\n');
        
        if (asNewProfile) {
          const targetTitle = (autoGlossaryTargetNovel?.title || (chapters && chapters[0]?.title) || (activeNovelRecord && activeNovelRecord.title) || '').replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const defaultName = targetTitle ? `${targetTitle} Glossary` : 'Auto Extracted Glossary';
          const name = prompt('Enter profile name for these terms:', defaultName);
          if (!name || !name.trim()) return;
          await handleSaveGlossary(name.trim(), structuredGlossary);

          if (autoGlossaryTargetNovel && window.GeminiNovelDB) {
            try {
              const novelId = autoGlossaryTargetNovel.id || autoGlossaryTargetNovel.sourceUrl;
              if (novelId) {
                await window.GeminiNovelDB.updateNovel(novelId, {
                  glossaryProfile: name.trim(),
                  glossary: structuredGlossary
                });
              }
            } catch(e) {
              console.warn('Could not bind glossary to novel in DB:', e);
            }
          }
          setAutoGlossaryModalOpen(false);
          setAutoGlossaryTargetNovel(null);
          window.telemetryLog?.('AUTO_GLOSSARY', `Saved ${selected.length} terms as profile "${name.trim()}".`);
          toast(`Saved ${selected.length} terms as profile "${name.trim()}"!`, 'success');
        } else {
          const current = (terminology || '').trim();
          let updated = '';
          if (!current) {
            updated = structuredGlossary;
          } else if (current.includes('## I.') || current.includes('## II.')) {
            updated = `${current}\n\n${formattedLines}`;
          } else {
            updated = `${current}\n${formattedLines}`;
          }
          setTerminology(updated);
          localStorage.setItem('terminology', updated);
          if (autoGlossaryTargetNovel && window.GeminiNovelDB) {
            try {
              const novelId = autoGlossaryTargetNovel.id || autoGlossaryTargetNovel.sourceUrl;
              if (novelId) {
                await window.GeminiNovelDB.updateNovel(novelId, {
                  glossary: updated
                });
              }
            } catch(e) {}
          }
          setAutoGlossaryModalOpen(false);
          setAutoGlossaryTargetNovel(null);
          window.telemetryLog?.('AUTO_GLOSSARY', `Applied ${selected.length} terms to active glossary.`);
          toast(`Applied ${selected.length} terms to active glossary!`, 'success');
        }
      };

      // --- Feature 4: Name Consistency Verifier Engine ---
      const parseUniversalGlossaryPairs = (text) => {
        if (!text) return [];
        const lines = text.split(/\r?\n/);
        const pairs = [];
        const seen = new Set();

        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('/*')) continue;
          
          // Strip inline comments (# comment or // comment)
          const hashIdx = line.indexOf('#');
          if (hashIdx !== -1) line = line.slice(0, hashIdx).trim();
          const slashIdx = line.indexOf('//');
          if (slashIdx !== -1) line = line.slice(0, slashIdx).trim();

          // Strip leading list bullets: "- ", "* ", "• ", "1. ", "1) "
          line = line.replace(/^[-*•\s]+/, '').replace(/^\d+[\.\)]\s+/, '').trim();
          if (!line) continue;

          let orig = '';
          let target = '';

          const arrowMatch = line.match(/\s*(?:->|=>|→)\s*/);
          if (arrowMatch) {
            const idx = line.indexOf(arrowMatch[0]);
            orig = line.slice(0, idx).trim();
            target = line.slice(idx + arrowMatch[0].length).trim();
          } else {
            const eqIdx = line.indexOf('=');
            if (eqIdx !== -1) {
              orig = line.slice(0, eqIdx).trim();
              target = line.slice(eqIdx + 1).trim();
            }
          }

          if (!orig || !target) continue;
          if (/^(?:Example|Legend|Note|Rule|Warning)/i.test(orig)) continue;

          const origClean = orig.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const targetClean = target.replace(/\s*\[[MFmf]\]\s*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
          const primaryTarget = targetClean.split(/\s*[\/\;]\s*/)[0].replace(/^["']|["']$/g, '').trim();

          if (origClean && primaryTarget && !seen.has(origClean)) {
            seen.add(origClean);
            pairs.push({ orig: origClean, target: primaryTarget });
          }
        }
        return pairs;
      };

      const handleRunConsistencyCheck = () => {
        const glossaryPairs = parseUniversalGlossaryPairs(terminology || '');
        if (glossaryPairs.length === 0) {
          return toast('No glossary pairs found in active glossary. Use format "Original -> Translation" or "Original = Translation".', 'warning');
        }

        const chs = (translatedChapters && translatedChapters.length > 0)
          ? translatedChapters
          : (chapters && chapters.length > 0 ? chapters : [{ title: 'Current Output', content: assembledText || inputText }]);

        setIsAuditingConsistency(true);
        const results = [];

        glossaryPairs.forEach(pair => {
          const targetTerm = pair.target;
          const origTerm = pair.orig;
          let totalTargetOccurrences = 0;
          let totalLeaks = 0;
          const chapterOccurrences = [];
          const leaksFoundIn = [];
          const driftMatches = [];

          const words = targetTerm.split(/\s+/).filter(w => w.length >= 4);

          chs.forEach((ch, idx) => {
            const text = (ch?.content || ch?.text || '');
            const chName = ch?.title || `Ch. ${idx + 1}`;
            
            try {
              const targetRegex = new RegExp('\\b' + escapeRegExp(targetTerm) + '\\b', 'gi');
              const targetMatches = (text.match(targetRegex) || []).length;
              if (targetMatches > 0) {
                totalTargetOccurrences += targetMatches;
                chapterOccurrences.push({ chName, count: targetMatches });
              }

              if (origTerm && origTerm.length >= 2) {
                const leakRegex = new RegExp(escapeRegExp(origTerm), 'g');
                const leakMatches = (text.match(leakRegex) || []).length;
                if (leakMatches > 0) {
                  totalLeaks += leakMatches;
                  leaksFoundIn.push({ chName, count: leakMatches });
                }
              }

              words.forEach(w => {
                if (w.includes('ou')) {
                  const alternate = w.replace(/ou/g, 'o');
                  const altRegex = new RegExp('\\b' + escapeRegExp(alternate) + '\\b', 'gi');
                  const altMatches = (text.match(altRegex) || []).length;
                  if (altMatches > 0) {
                    driftMatches.push({ chName, found: alternate, shouldBe: w, count: altMatches });
                  }
                }
              });
            } catch(e) {}
          });

          results.push({
            orig: origTerm,
            target: targetTerm,
            totalCount: totalTargetOccurrences,
            chapterOccurrences,
            totalLeaks,
            leaksFoundIn,
            driftMatches,
            status: totalLeaks > 0 ? 'leak' : (driftMatches.length > 0 ? 'drift' : (totalTargetOccurrences > 0 ? 'good' : 'missing'))
          });
        });

        setConsistencyAuditResults(results);
        setIsAuditingConsistency(false);
        setConsistencyModalOpen(true);
      };

      const handleBatchFixDrift = (foundWord, targetWord) => {
        if (!foundWord || !targetWord) return;
        const regex = new RegExp('\\b' + escapeRegExp(foundWord) + '\\b', 'g');
        let replacedCount = 0;

        if (translatedChapters && translatedChapters.length > 0) {
          const updated = translatedChapters.map(ch => {
            if (!ch) return null;
            const c = ch.content || ch.text || '';
            const matches = (c.match(regex) || []).length;
            replacedCount += matches;
            return { ...ch, content: c.replace(regex, targetWord) };
          });
          setTranslatedChapters(updated);
        }

        if (assembledText) {
          const matches = (assembledText.match(regex) || []).length;
          if (replacedCount === 0) replacedCount += matches;
          setAssembledText(assembledText.replace(regex, targetWord));
        }

        toast(`Replaced ${replacedCount} occurrences of "${foundWord}" with "${targetWord}"!`, 'success');
        try { window.NativeBridge?.showCompletionNotification?.('Name Drift Fixed! 🔍', `Replaced ${replacedCount} occurrences of "${foundWord}" with "${targetWord}".`); } catch(e) {}
        handleRunConsistencyCheck();
      };

      // --- Full App Backup & Restore & WebDAV Cloud Sync ---
      const generateBackupPayload = async (shouldIncludeKeys = false) => {
        const currentSavedGlossaries = (savedGlossaries && savedGlossaries.length > 0)
          ? savedGlossaries
          : (() => {
              try { return JSON.parse(localStorage.getItem('savedGlossaries') || '[]'); } catch (e) { return []; }
            })();
        const currentTerminology = (terminology && terminology.trim())
          ? terminology
          : (localStorage.getItem('terminology') || '');
        const currentInstructions = (customInstructions && customInstructions.trim())
          ? customInstructions
          : (localStorage.getItem('customInstructions') || '');

        let fullHistory = await dbGetAll('history');
        if (!fullHistory || fullHistory.length === 0) {
          fullHistory = (history && history.length > 0) ? history : (() => {
            try { return JSON.parse(localStorage.getItem('translationHistory') || '[]'); } catch (e) { return []; }
          })();
        }

        let novelLibrary = [];
        if (window.GeminiNovelDB) {
          try {
            novelLibrary = await window.GeminiNovelDB.getAllNovels();
          } catch (e) {
            console.warn('Backup novel library fetch error:', e);
          }
        }
        const webImportMeta = (() => {
          try {
            return JSON.parse(localStorage.getItem('gemini_web_import_history_meta') || localStorage.getItem('gemini_web_import_history') || '[]');
          } catch (e) {
            return [];
          }
        })();

        const recentTelemetry = (typeof window !== 'undefined' && window.AppLogger && Array.isArray(window.AppLogger.logs))
          ? window.AppLogger.logs.slice(-300)
          : [];

        const backup = {
          version: VERSION,
          timestamp: new Date().toISOString(),
          includesApiKeys: shouldIncludeKeys,
          provider,
          geminiModel,
          deepseekModel,
          openaiModel,
          claudeModel,
          concurrency,
          contextAware,
          chunkSizePreset: chunkSizePreset || localStorage.getItem('chunkSizePreset') || 'turbo',
          enableThinking: enableThinking !== undefined ? enableThinking : (localStorage.getItem('enableThinking') === 'true'),
          strictModel: strictModel !== undefined ? strictModel : (localStorage.getItem('strictModel') !== 'false'),
          enableStreaming: enableStreaming !== undefined ? enableStreaming : (localStorage.getItem('enableStreaming') !== 'false'),
          enableGlossary: enableGlossary !== undefined ? enableGlossary : (localStorage.getItem('enableGlossary') === 'true'),
          customModel: customModel || localStorage.getItem('customModel') || '',
          useCustomModel: useCustomModel !== undefined ? useCustomModel : (localStorage.getItem('useCustomModel') === 'true'),
          customDeepseekModel: customDeepseekModel || localStorage.getItem('customDeepseekModel') || '',
          useCustomDeepseekModel: useCustomDeepseekModel !== undefined ? useCustomDeepseekModel : (localStorage.getItem('useCustomDeepseekModel') === 'true'),
          savedGlossaries: currentSavedGlossaries,
          defaultGlossaryName: defaultGlossaryName || localStorage.getItem('defaultGlossaryName') || null,
          terminology: currentTerminology,
          smartGlossary,
          customInstructions: currentInstructions,
          epubDropCaps: epubDropCaps !== undefined ? epubDropCaps : (localStorage.getItem('epubDropCaps') !== 'false'),
          epubSmartQuotes: epubSmartQuotes !== undefined ? epubSmartQuotes : (localStorage.getItem('epubSmartQuotes') !== 'false'),
          epubCleanWebArtifacts: epubCleanWebArtifacts !== undefined ? epubCleanWebArtifacts : (localStorage.getItem('epubCleanWebArtifacts') !== 'false'),
          epubFontTheme: epubFontTheme || localStorage.getItem('epubFontTheme') || 'literata',
          epubJustifyText: epubJustifyText !== undefined ? epubJustifyText : (localStorage.getItem('epubJustifyText') !== 'false'),
          epubIncludeImages: epubIncludeImages !== undefined ? epubIncludeImages : (localStorage.getItem('epubIncludeImages') !== 'false'),
          scrapeImages: scrapeImages !== undefined ? scrapeImages : (localStorage.getItem('scrapeImages') !== 'false'),
          readerTheme: readerTheme || localStorage.getItem('readerTheme') || 'sepia',
          readerFont: readerFont || localStorage.getItem('readerFont') || 'serif',
          readerFontSize: readerFontSize || parseInt(localStorage.getItem('readerFontSize')) || 18,
          readerJustify: localStorage.getItem('readerJustify') !== 'false',
          translationHistory: fullHistory,
          exportHistory: JSON.parse(localStorage.getItem('exportHistory') || '[]'),
          novelLibrary,
          webImportHistory: webImportMeta,
          telemetryLogs: recentTelemetry
        };

        if (shouldIncludeKeys) {
          const exportKeys = {};
          ['gemini', 'deepseek', 'openai', 'claude', 'deepl', 'libre'].forEach(prov => {
            const legacyKey = localStorage.getItem(`${prov}ApiKey`) || (prov === 'gemini' ? (localStorage.getItem('apiKey') || '') : '');
            const profiles = (apiKeysByProvider && apiKeysByProvider[prov]) ? [...apiKeysByProvider[prov]] : [];
            if (profiles.length > 0) {
              exportKeys[prov] = profiles.map(p => {
                if (!p.key && legacyKey) return { ...p, key: legacyKey };
                return p;
              });
            } else if (legacyKey) {
              const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
              exportKeys[prov] = [{ id: `${prov}-init`, name: `Primary ${provNames[prov] || prov} Key`, key: legacyKey }];
            } else {
              exportKeys[prov] = [];
            }
          });

          backup.apiKeysByProvider = exportKeys;
          backup.activeKeyIds = activeKeyIds;
          backup.geminiApiKey = exportKeys.gemini?.[0]?.key || localStorage.getItem('geminiApiKey') || localStorage.getItem('apiKey') || '';
          backup.deepseekApiKey = exportKeys.deepseek?.[0]?.key || localStorage.getItem('deepseekApiKey') || '';
          backup.openaiApiKey = exportKeys.openai?.[0]?.key || localStorage.getItem('openaiApiKey') || '';
          backup.claudeApiKey = exportKeys.claude?.[0]?.key || localStorage.getItem('claudeApiKey') || '';
          backup.deeplApiKey = exportKeys.deepl?.[0]?.key || localStorage.getItem('deeplApiKey') || '';
          backup.libreUrl = libreUrl;
        }
        return { backup, fullHistory, novelLibrary };
      };

      const exportFullBackup = async (forceIncludeKeys = null) => {
        try {
          const shouldIncludeKeys = forceIncludeKeys !== null ? forceIncludeKeys : includeApiKeysInBackup;
          const { backup, fullHistory, novelLibrary } = await generateBackupPayload(shouldIncludeKeys);
          const jsonStr = JSON.stringify(backup, null, 2);
          const backupFileName = `gemini_translator_backup_${shouldIncludeKeys ? 'with_keys_' : ''}${new Date().toISOString().slice(0, 10)}.json`;
          const blob = new Blob([jsonStr], { type: 'application/json' });

          await saveUniversalBlob(blob, backupFileName, 'application/json');
          const details = [];
          if (novelLibrary.length > 0) details.push(`${novelLibrary.length} novel(s)`);
          if (fullHistory.length > 0) details.push(`${fullHistory.length} history item(s)`);
          details.push('all settings');
          if (shouldIncludeKeys) details.push('keys');
          toast(`Full backup (${details.join(', ')}) saved to Downloads!`, 'success');
        } catch(e) {
          console.error('Full backup error:', e);
          toast('Backup save error: ' + e.message, 'error');
        }
      };

      const testWebDavConnection = async () => {
        if (!webdavUrl || !webdavUrl.trim()) return toast('Please enter a WebDAV URL in Settings', 'warning');
        setWebdavTesting(true);
        try {
          const cleanUrl = webdavUrl.trim().replace(/\/+$/, '');
          const headers = {};
          if (webdavUser || webdavPass) {
            headers['Authorization'] = 'Basic ' + btoa(`${webdavUser}:${webdavPass}`);
          }
          const res = await (window.NativeBridge?.webDavRequest ? window.NativeBridge.webDavRequest({
            url: cleanUrl,
            method: 'PROPFIND',
            headers: { ...headers, 'Depth': '0' }
          }) : fetch(cleanUrl, { method: 'GET', headers }));

          if (res.status >= 200 && res.status < 400) {
            toast(`✅ Connected to WebDAV! (Status ${res.status})`, 'success');
          } else if (res.status === 401 || res.status === 403) {
            toast(`Authentication failed (HTTP ${res.status}). Check username/password.`, 'error');
          } else {
            toast(`WebDAV server responded with HTTP ${res.status}.`, 'info');
          }
        } catch (e) {
          toast(`Connection failed: ${e.message}`, 'error');
        } finally {
          setWebdavTesting(false);
        }
      };

      const backupToWebDav = async () => {
        if (!webdavUrl || !webdavUrl.trim()) return toast('Please configure WebDAV URL in Settings first', 'warning');
        setWebdavSyncing(true);
        try {
          const cleanUrl = webdavUrl.trim().replace(/\/+$/, '');
          const targetFolder = (webdavPath || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
          const fullBackupUrl = `${cleanUrl}/${targetFolder}/backup_full.json`;
          const metaUrl = `${cleanUrl}/${targetFolder}/metadata.json`;

          const headers = { 'Content-Type': 'application/json' };
          if (webdavUser || webdavPass) {
            headers['Authorization'] = 'Basic ' + btoa(`${webdavUser}:${webdavPass}`);
          }

          const { backup } = await generateBackupPayload(true);
          const backupJson = JSON.stringify(backup, null, 2);
          const metaJson = JSON.stringify({
            version: VERSION,
            lastSync: new Date().toISOString(),
            device: navigator.userAgent.includes('Android') ? 'Android' : 'Desktop/Web',
            novelCount: (backup.novelLibrary || []).length,
            glossaryCount: (backup.savedGlossaries || []).length
          }, null, 2);

          // 1. Try MKCOL to ensure directory exists (ignore if already exists or fails)
          try {
            await window.NativeBridge?.webDavRequest?.({
              url: `${cleanUrl}/${targetFolder}`,
              method: 'MKCOL',
              headers
            });
          } catch(e) {}

          // 2. PUT backup payload
          const uploadRes = await (window.NativeBridge?.webDavRequest ? window.NativeBridge.webDavRequest({
            url: fullBackupUrl,
            method: 'PUT',
            headers,
            body: backupJson
          }) : fetch(fullBackupUrl, { method: 'PUT', headers, body: backupJson }));

          // 3. PUT metadata
          try {
            await (window.NativeBridge?.webDavRequest ? window.NativeBridge.webDavRequest({
              url: metaUrl,
              method: 'PUT',
              headers,
              body: metaJson
            }) : fetch(metaUrl, { method: 'PUT', headers, body: metaJson }));
          } catch(e) {}

          if (uploadRes.status >= 200 && uploadRes.status < 300) {
            const timeStr = new Date().toLocaleString();
            toast(`☁️ WebDAV Backup Successful! Saved to /${targetFolder}/`, 'success');
            try { window.NativeBridge?.showCompletionNotification?.('Cloud Backup Complete! ☁️', `Backup saved to WebDAV /${targetFolder}/.`); } catch(e) {}
            setWebdavLastSync(timeStr);
            localStorage.setItem('webdavLastSync', timeStr);
          } else {
            throw new Error(`HTTP ${uploadRes.status}: ${uploadRes.data?.slice(0, 100) || 'Upload failed'}`);
          }
        } catch (e) {
          console.error('WebDAV Backup Error:', e);
          toast(`WebDAV Backup failed: ${e.message}`, 'error');
        } finally {
          setWebdavSyncing(false);
        }
      };

      const restoreFromWebDav = async () => {
        if (!webdavUrl || !webdavUrl.trim()) return toast('Please configure WebDAV URL in Settings first', 'warning');
        setWebdavSyncing(true);
        try {
          const cleanUrl = webdavUrl.trim().replace(/\/+$/, '');
          const targetFolder = (webdavPath || 'GeminiTranslator').trim().replace(/^\/+|\/+$/g, '');
          const fullBackupUrl = `${cleanUrl}/${targetFolder}/backup_full.json`;

          const headers = {};
          if (webdavUser || webdavPass) {
            headers['Authorization'] = 'Basic ' + btoa(`${webdavUser}:${webdavPass}`);
          }

          const res = await (window.NativeBridge?.webDavRequest ? window.NativeBridge.webDavRequest({
            url: fullBackupUrl,
            method: 'GET',
            headers
          }) : fetch(fullBackupUrl, { method: 'GET', headers }));

          if (res.status !== 200 || !res.data) {
            throw new Error(`HTTP ${res.status}: Backup file not found on WebDAV.`);
          }

          const data = JSON.parse(res.data);
          const countNovels = (data.novelLibrary || []).length;
          const countGloss = (data.savedGlossaries || []).length;

          if (confirm(`Found WebDAV backup (${countNovels} novels, ${countGloss} glossaries). Restore now? This will safely merge and update your data.`)) {
            await applyRestoredData(data);
            toast(`Restored ${countNovels} novels and ${countGloss} glossaries from WebDAV!`, 'success');
            try { window.NativeBridge?.showCompletionNotification?.('Cloud Restore Complete! 📥', `Restored ${countNovels} novels and ${countGloss} glossaries from WebDAV.`); } catch(e) {}
          }
        } catch (e) {
          toast(`WebDAV Restore failed: ${e.message}`, 'error');
        } finally {
          setWebdavSyncing(false);
        }
      };

      // --- Google Drive Cloud Sync Engine Handlers (Mihon/Komikku Standard) ---
      const testGoogleDriveConnection = async () => {
        if (!window.GoogleDriveSync?.isConnected()) {
          return toast('Google Drive is not connected. Click "Sign in with Google" first.', 'warning');
        }
        setGdriveTesting(true);
        try {
          const res = await window.GoogleDriveSync.testConnection();
          if (res.success && res.profile) {
            setGdriveUser(res.profile);
            setGdriveConnected(true);
            toast(`✅ Connected to Google Drive! (${res.profile.emailAddress || res.profile.displayName})`, 'success');
          } else {
            toast(`Google Drive error: ${res.error}`, 'error');
          }
        } catch (e) {
          toast(`Google Drive test failed: ${e.message}`, 'error');
        } finally {
          setGdriveTesting(false);
        }
      };

      const backupToGoogleDrive = async () => {
        if (!window.GoogleDriveSync?.isConnected()) {
          return toast('Please connect Google Drive in Settings first', 'warning');
        }
        setGdriveSyncing(true);
        try {
          const { backup, fullHistory, novelLibrary } = await generateBackupPayload(includeApiKeysInBackup);
          const res = await window.GoogleDriveSync.uploadBackup(backup);
          if (res.success) {
            const timeStr = new Date().toLocaleString();
            setGdriveLastSync(timeStr);
            toast(`☁️ Google Drive Backup Successful! (${novelLibrary.length} novels, ${fullHistory.length} history items)`, 'success');
          }
        } catch (e) {
          console.error('Google Drive Backup Error:', e);
          toast(`Google Drive Backup failed: ${e.message}`, 'error');
        } finally {
          setGdriveSyncing(false);
        }
      };

      const restoreFromGoogleDrive = async () => {
        if (!window.GoogleDriveSync?.isConnected()) {
          return toast('Please connect Google Drive in Settings first', 'warning');
        }
        setGdriveSyncing(true);
        try {
          toast('Fetching backup from Google Drive…', 'info');
          const { data, meta } = await window.GoogleDriveSync.downloadBackup();
          const countNovels = (data.novelLibrary || data.novels || []).length;
          const countGloss = (data.savedGlossaries || data.glossaries || []).length;
          const backupDate = meta.modifiedTime ? new Date(meta.modifiedTime).toLocaleString() : 'recent';

          if (confirm(`Found Google Drive backup (${backupDate}) with ${countNovels} novels and ${countGloss} glossaries. Restore now? This will safely merge with your local library.`)) {
            await applyRestoredData(data);
            toast(`Restored ${countNovels} novels and ${countGloss} glossaries from Google Drive!`, 'success');
            try { window.NativeBridge?.showCompletionNotification?.('Google Drive Restore Complete! 📥', `Restored ${countNovels} novels and ${countGloss} glossaries from Google Drive.`); } catch(e) {}
          }
        } catch (e) {
          toast(`Google Drive Restore failed: ${e.message}`, 'error');
        } finally {
          setGdriveSyncing(false);
        }
      };

      const connectGoogleDrive = async () => {
        if (!window.GoogleDriveSync?.getClientId()) {
          setGdriveConfigModalOpen(true);
          toast('Please configure your Google OAuth Client ID or paste an Access Token.', 'info');
          return;
        }
        try {
          toast('Opening Google Authorization window…', 'info');
          await window.GoogleDriveSync.launchOAuthFlow();
          const testRes = await window.GoogleDriveSync.testConnection();
          setGdriveConnected(window.GoogleDriveSync.isConnected());
          if (testRes.success && testRes.profile) {
            setGdriveUser(testRes.profile);
            toast(`Google Drive connected as ${testRes.profile.emailAddress}! 🎉`, 'success');
          } else {
            toast('Google Drive connected!', 'success');
          }
        } catch (err) {
          if (err.message === 'MISSING_CLIENT_ID') {
            setGdriveConfigModalOpen(true);
          } else {
            console.warn('Google Drive Auth error:', err);
            toast(`Google Drive Sign-in: ${err.message}`, 'error');
          }
        }
      };

      const backupToGoogleDriveFile = async () => {
        try {
          const { backup, novelLibrary, fullHistory } = await generateBackupPayload(includeApiKeysInBackup);
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          await saveUniversalBlob(blob, 'gemini_translator_backup.json', 'application/json', true);
          toast(`📁 Backup exported! (${novelLibrary.length} novels, ${fullHistory.length} history items)`, 'success');
        } catch (e) {
          toast('Backup error: ' + e.message, 'error');
        }
      };

      const disconnectGoogleDrive = () => {
        window.GoogleDriveSync?.disconnect();
        setGdriveConnected(false);
        setGdriveUser(null);
        toast('Google Drive disconnected.', 'info');
      };

      const applyRestoredData = async (data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid backup data format.');
        
        // 1. Array format (Glossary export)
        if (Array.isArray(data)) {
          const merged = [...savedGlossaries];
          data.forEach(g => {
            if (g.name && g.content && !merged.find(x => x.name === g.name)) merged.push(g);
          });
          setSavedGlossaries(merged);
          localStorage.setItem('savedGlossaries', JSON.stringify(merged));
          if (merged.length > 0 && !terminology) {
            setTerminology(merged[0].content || '');
            localStorage.setItem('terminology', merged[0].content || '');
            setActiveGlossaryId(merged[0].name);
          }
          toast(`Imported ${data.length} glossaries!`);
          return;
        }

        // 2. Full Backup format
        let keyCount = 0;
        let glossaryCount = 0;
        let restoredKeys = {};

        if (data.savedGlossaries && Array.isArray(data.savedGlossaries)) {
          setSavedGlossaries(data.savedGlossaries);
          try { localStorage.setItem('savedGlossaries', JSON.stringify(data.savedGlossaries)); } catch (e) {}
          data.savedGlossaries.forEach(g => dbPut('glossaries', g));
          glossaryCount = data.savedGlossaries.length;
        }
        if (data.translationHistory && Array.isArray(data.translationHistory)) {
          setHistory(data.translationHistory);
          try { localStorage.setItem('translationHistory', JSON.stringify(data.translationHistory.slice(0, 10))); } catch (e) {}
          data.translationHistory.forEach(h => dbPut('history', h));
        }
        if (data.exportHistory && Array.isArray(data.exportHistory)) {
          localStorage.setItem('exportHistory', JSON.stringify(data.exportHistory));
        }
        if (data.terminology !== undefined && data.terminology !== null) {
          setTerminology(data.terminology);
          localStorage.setItem('terminology', data.terminology);
        } else if (data.savedGlossaries && data.savedGlossaries.length > 0) {
          setTerminology(data.savedGlossaries[0].content || '');
          localStorage.setItem('terminology', data.savedGlossaries[0].content || '');
          setActiveGlossaryId(data.savedGlossaries[0].name);
        }
        if (data.customInstructions !== undefined && data.customInstructions !== null) {
          setCustomInstructions(data.customInstructions);
          localStorage.setItem('customInstructions', data.customInstructions);
        } else if (data.savedGlossaries && data.savedGlossaries.length > 0 && data.savedGlossaries[0].instructions) {
          setCustomInstructions(data.savedGlossaries[0].instructions);
          localStorage.setItem('customInstructions', data.savedGlossaries[0].instructions);
        }
        if (data.defaultGlossaryName) {
          setDefaultGlossaryName(data.defaultGlossaryName);
          localStorage.setItem('defaultGlossaryName', data.defaultGlossaryName);
        }
        if (data.smartGlossary !== undefined) {
          setSmartGlossary(data.smartGlossary);
          localStorage.setItem('smartGlossary', data.smartGlossary);
        }
        if (data.enableGlossary !== undefined) {
          setEnableGlossary(!!data.enableGlossary);
          localStorage.setItem('enableGlossary', String(data.enableGlossary));
        }
        if (data.provider) {
          setProvider(data.provider);
          localStorage.setItem('translationProvider', data.provider);
        }
        if (data.geminiModel) {
          setGeminiModel(data.geminiModel);
          localStorage.setItem('geminiModel', data.geminiModel);
        }
        if (data.deepseekModel) {
          setDeepseekModel(data.deepseekModel);
          localStorage.setItem('deepseekModel', data.deepseekModel);
        }
        if (data.openaiModel) {
          setOpenaiModel(data.openaiModel);
          localStorage.setItem('openaiModel', data.openaiModel);
        }
        if (data.claudeModel) {
          setClaudeModel(data.claudeModel);
          localStorage.setItem('claudeModel', data.claudeModel);
        }
        if (data.concurrency) {
          setConcurrency(data.concurrency);
          localStorage.setItem('concurrency', String(data.concurrency));
        }
        if (data.contextAware !== undefined) {
          setContextAware(data.contextAware);
          localStorage.setItem('contextAware', data.contextAware);
        }
        if (data.chunkSizePreset) {
          setChunkSizePreset(data.chunkSizePreset);
          localStorage.setItem('chunkSizePreset', data.chunkSizePreset);
        }
        if (data.enableThinking !== undefined) {
          setEnableThinking(!!data.enableThinking);
          localStorage.setItem('enableThinking', String(data.enableThinking));
        }
        if (data.strictModel !== undefined) {
          setStrictModel(!!data.strictModel);
          localStorage.setItem('strictModel', String(data.strictModel));
        }
        if (data.enableStreaming !== undefined) {
          setEnableStreaming(!!data.enableStreaming);
          localStorage.setItem('enableStreaming', String(data.enableStreaming));
        }
        if (data.customModel !== undefined) {
          setCustomModel(data.customModel);
          localStorage.setItem('customModel', data.customModel);
        }
        if (data.useCustomModel !== undefined) {
          setUseCustomModel(!!data.useCustomModel);
          localStorage.setItem('useCustomModel', String(data.useCustomModel));
        }
        if (data.customDeepseekModel !== undefined) {
          setCustomDeepseekModel(data.customDeepseekModel);
          localStorage.setItem('customDeepseekModel', data.customDeepseekModel);
        }
        if (data.useCustomDeepseekModel !== undefined) {
          setUseCustomDeepseekModel(!!data.useCustomDeepseekModel);
          localStorage.setItem('useCustomDeepseekModel', String(data.useCustomDeepseekModel));
        }

        // EPUB Styling & Typography preferences
        if (data.epubDropCaps !== undefined) {
          setEpubDropCaps(!!data.epubDropCaps);
          localStorage.setItem('epubDropCaps', String(data.epubDropCaps));
        }
        if (data.epubSmartQuotes !== undefined) {
          setEpubSmartQuotes(!!data.epubSmartQuotes);
          localStorage.setItem('epubSmartQuotes', String(data.epubSmartQuotes));
        }
        if (data.epubCleanWebArtifacts !== undefined) {
          setEpubCleanWebArtifacts(!!data.epubCleanWebArtifacts);
          localStorage.setItem('epubCleanWebArtifacts', String(data.epubCleanWebArtifacts));
        }
        if (data.epubFontTheme) {
          setEpubFontTheme(data.epubFontTheme);
          localStorage.setItem('epubFontTheme', data.epubFontTheme);
        }
        if (data.epubJustifyText !== undefined) {
          setEpubJustifyText(!!data.epubJustifyText);
          localStorage.setItem('epubJustifyText', String(data.epubJustifyText));
        }
        if (data.epubIncludeImages !== undefined) {
          setEpubIncludeImages(!!data.epubIncludeImages);
          localStorage.setItem('epubIncludeImages', String(data.epubIncludeImages));
        }
        if (data.scrapeImages !== undefined) {
          setScrapeImages(!!data.scrapeImages);
          localStorage.setItem('scrapeImages', String(data.scrapeImages));
        }

        // Reader Preferences
        if (data.readerTheme) {
          setReaderTheme(data.readerTheme);
          localStorage.setItem('readerTheme', data.readerTheme);
        }
        if (data.readerFont) {
          setReaderFont(data.readerFont);
          localStorage.setItem('readerFont', data.readerFont);
        }
        if (data.readerFontSize) {
          setReaderFontSize(data.readerFontSize);
          localStorage.setItem('readerFontSize', String(data.readerFontSize));
        }
        if (data.readerJustify !== undefined) {
          localStorage.setItem('readerJustify', String(data.readerJustify));
        }

        // Novel Library Restore (Full chapters + Metadata)
        let novelCount = 0;
        if (data.novelLibrary && Array.isArray(data.novelLibrary) && data.novelLibrary.length > 0) {
          if (window.GeminiNovelDB) {
            for (const novel of data.novelLibrary) {
              try {
                if (!novel.id) novel.id = 'novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                await window.GeminiNovelDB.saveNovel(novel);
              } catch(e) {
                console.warn('Restore novel error:', e);
              }
            }
          }
          novelCount = data.novelLibrary.length;
        }
        if (data.webImportHistory && Array.isArray(data.webImportHistory)) {
          setWebImportHistory(data.webImportHistory);
          try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(data.webImportHistory)); } catch (e) {}
          if (novelCount === 0) novelCount = data.webImportHistory.length;
        } else if (data.novelLibrary && Array.isArray(data.novelLibrary) && data.novelLibrary.length > 0) {
          const synthesizedMeta = data.novelLibrary.map(n => ({
            id: n.id,
            title: n.title || 'Untitled Novel',
            author: n.author || 'Author',
            summary: (n.summary || '').substring(0, 300),
            cover: n.cover || '',
            tags: n.tags || [],
            chapterCount: n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0),
            totalChapterCount: n.totalChapterCount || (n.chapterList ? n.chapterList.length : (n.chapterCount || (n.rawChapters ? n.rawChapters.length : 0))),
            volumeCount: n.volumeCount || 0,
            wordCount: n.wordCount || 0,
            timestamp: n.timestamp || new Date().toISOString(),
            isEpub: !!n.isEpub,
            sourceUrl: n.sourceUrl || '',
            folderTreeUri: n.folderTreeUri || '',
            folderPath: n.folderPath || ''
          }));
          setWebImportHistory(synthesizedMeta);
          try { localStorage.setItem('gemini_web_import_history_meta', JSON.stringify(synthesizedMeta)); } catch (e) {}
        }

        // Telemetry Diagnostics Restore
        if (data.telemetryLogs && Array.isArray(data.telemetryLogs) && window.AppLogger) {
          window.AppLogger.logs = [...data.telemetryLogs];
          window.AppLogger.listeners.forEach(fn => { try { fn([...window.AppLogger.logs]); } catch(e) {} });
        }

        // Restore API Key Profiles (Robust Multi-Format Parsing)
        if (data.apiKeysByProvider && typeof data.apiKeysByProvider === 'object') {
          ['gemini', 'deepseek', 'openai', 'claude', 'deepl', 'libre'].forEach(prov => {
            const list = data.apiKeysByProvider[prov];
            if (Array.isArray(list) && list.length > 0) {
              restoredKeys[prov] = list.filter(k => k && (k.key || typeof k === 'string')).map((k, idx) => {
                if (typeof k === 'string') return { id: `${prov}-${Date.now()}-${idx}`, name: `${prov.toUpperCase()} Key ${idx + 1}`, key: k.trim() };
                return k;
              });
              restoredKeys[prov].forEach(k => {
                if (k.key && k.key.trim()) keyCount++;
              });
              if (restoredKeys[prov][0]?.key) {
                localStorage.setItem(`${prov}ApiKey`, restoredKeys[prov][0].key);
                if (prov === 'gemini') localStorage.setItem('apiKey', restoredKeys[prov][0].key);
              }
            }
          });
        }

        // Support Legacy Single Keys in backup
        const legacyMappings = {
          gemini: data.geminiApiKey || data.apiKey || '',
          deepseek: data.deepseekApiKey || '',
          openai: data.openaiApiKey || '',
          claude: data.claudeApiKey || '',
          deepl: data.deeplApiKey || ''
        };

        Object.entries(legacyMappings).forEach(([prov, lKey]) => {
          if (lKey && lKey.trim()) {
            localStorage.setItem(`${prov}ApiKey`, lKey);
            if (prov === 'gemini') localStorage.setItem('apiKey', lKey);
            if (!restoredKeys[prov] || restoredKeys[prov].length === 0) {
              const provNames = { gemini: 'Gemini', deepseek: 'DeepSeek', openai: 'OpenAI', claude: 'Claude', deepl: 'DeepL', libre: 'LibreTranslate' };
              restoredKeys[prov] = [{ id: `${prov}-init`, name: `Primary ${provNames[prov] || prov} Key`, key: lKey }];
              keyCount++;
            } else if (!restoredKeys[prov][0].key) {
              restoredKeys[prov][0].key = lKey;
              keyCount++;
            }
          }
        });

        if (Object.keys(restoredKeys).length > 0) {
          setApiKeysByProvider(prev => {
            const updated = { ...prev, ...restoredKeys };
            localStorage.setItem('apiKeysByProvider', JSON.stringify(updated));
            return updated;
          });
        }

        if (data.activeKeyIds && typeof data.activeKeyIds === 'object') {
          setActiveKeyIds(data.activeKeyIds);
          localStorage.setItem('activeKeyIds', JSON.stringify(data.activeKeyIds));
        }

        if (data.libreUrl) {
          setLibreUrl(data.libreUrl);
          localStorage.setItem('libreUrl', data.libreUrl);
        }

        const parts = [];
        if (keyCount > 0) parts.push(`${keyCount} API key(s)`);
        if (glossaryCount > 0) parts.push(`${glossaryCount} glossary profile(s)`);
        else if (data.terminology && data.terminology.trim()) parts.push('active glossary');
        if (data.translationHistory && data.translationHistory.length > 0) parts.push(`${data.translationHistory.length} book session(s)`);
        if (novelCount > 0) parts.push(`${novelCount} library novel(s)`);
        parts.push('all settings & typography');
        toast(` Restored ${parts.join(', ')} successfully!`);
      };

      const readFileContentAsText = (file) => {
        return new Promise((resolve, reject) => {
          if (file.text) {
            file.text().then(resolve).catch(() => {
              const reader = new FileReader();
              reader.onload = (evt) => resolve(evt.target.result);
              reader.onerror = (err) => reject(err);
              reader.readAsText(file);
            });
          } else {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          }
        });
      };

      const importFullBackup = async (e) => {
        const f = e.target?.files?.[0];
        if (!f) return;
        try {
          const txt = await readFileContentAsText(f);
          const data = JSON.parse(txt);
          await applyRestoredData(data);
        } catch (err) {
          console.error("Backup import error:", err);
          setError('Failed to restore backup: ' + err.message);
          toast('Failed to restore backup: ' + err.message, 'error');
        }
        if (e.target) e.target.value = '';
      };

      const pasteAndRestoreBackup = async () => {
        try {
          let text = '';
          if (navigator.clipboard?.readText) {
            try { text = await navigator.clipboard.readText(); } catch (e) {}
          }
          const input = prompt('Paste your backup JSON content below:', text);
          if (!input || !input.trim()) return;
          const data = JSON.parse(input.trim());
          await applyRestoredData(data);
        } catch (err) {
          setError('Failed to parse backup JSON: ' + err.message);
          toast('Failed to parse backup JSON: ' + err.message, 'error');
        }
      };

      // --- Web Novel Crawl Pause, Cancel & Resume Controls ---
      const handleStartFetch = async (isResume = false, resumeSessionData = null, autoExportEpub = false, overrideUrl = null) => {
        const targetSession = resumeSessionData || (isResume ? activeCrawlSession : null);
        const targetUrl = (overrideUrl || targetSession?.url || (targetSession?.sourceUrl) || webImportUrl).trim();

        if (!targetUrl) {
          toast('Please enter a novel URL to fetch.', 'warning');
          return;
        }

        setIsFetchingUrl(true);
        setIsFetchingPaused(false);
        setWebImportError(null);
        setWebImportStatus(isResume ? 'Resuming novel crawl…' : 'Connecting to source…');
        window.__scrapeImages = scrapeImages;

        try {
          window.NativeBridge?.acquireWakeLock?.('Gemini Web Importer', isResume ? 'Resuming novel crawl...' : 'Starting novel download...');
        } catch (e) {}

        const initialChapters = targetSession?.chapters || targetSession?.rawChapters || [];
        const novelId = targetSession?.id || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

        let lastPersistTime = 0;
        let pendingSaveTimer = null;
        let latestSessionSnapshot = null;

        const flushCrawlPersistence = (session) => {
          if (!session) return;
          try {
            localStorage.setItem('gemini_active_crawl_session', JSON.stringify(session));
          } catch (e) {}
          saveNovelToHistory(session);
        };

        try {
          const data = await window.WebNovelImporter.importUrl(targetUrl, (status, pct) => {
            setWebImportStatus(status);
          }, {
            initialChapters,
            onChapterDone: (newChapterObj, allChapters, stats) => {
              const totalChs = stats.total || stats.totalCount || targetSession?.totalChapterCount || (stats.chapterList ? stats.chapterList.length : 0);
              const currentTotal = totalChs > 0 ? totalChs : Math.max(allChapters.length + 1, targetSession?.totalChapterCount || 0);
              const isIncomplete = totalChs > 0 ? (allChapters.length < totalChs) : true;

              const existingFolder = getNovelFolderOptions({ id: novelId, title: stats.title || targetSession?.title, sourceUrl: targetUrl });
              const customTitle = targetSession?.customTitle || getCustomTitle(targetUrl) || getCustomTitle(novelId) || (targetSession?.title !== stats.title ? targetSession?.title : null);
              const sessionObj = {
                id: novelId,
                url: targetUrl,
                sourceUrl: targetUrl,
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
                setActiveCrawlSession(sessionObj);
                setWebImportData(sessionObj);
                flushCrawlPersistence(sessionObj);
              } else {
                if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
                pendingSaveTimer = setTimeout(() => {
                  if (latestSessionSnapshot) {
                    setActiveCrawlSession(latestSessionSnapshot);
                    setWebImportData(latestSessionSnapshot);
                    flushCrawlPersistence(latestSessionSnapshot);
                  }
                }, 1200);
              }

              setWebImportStatus(`Chapter ${stats.current || stats.completedCount || allChapters.length}/${currentTotal}: ${(newChapterObj.title || '').substring(0, 32)}…`);
            }
          });

          // Flush any pending save immediately upon completion/pause
          if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
          if (latestSessionSnapshot) {
            flushCrawlPersistence(latestSessionSnapshot);
          }

          const ctrl = window.WebNovelImporter?.getActiveController?.();
          if (ctrl?.isPaused) {
            setIsFetchingPaused(true);
            setIsFetchingUrl(false);
            const finalSession = latestSessionSnapshot || (data?.chapters ? { ...targetSession, chapters: data.chapters } : null);
            if (finalSession) {
              setActiveCrawlSession(finalSession);
              setWebImportData(finalSession);
              flushCrawlPersistence(finalSession);
            }
            if (ctrl.circuitBreakerTripped) {
              setWebImportError({
                message: ctrl.pauseReason || '3 consecutive chapters unreachable. Crawl auto-paused to protect novel data.',
                isCircuitBreaker: true,
                targetUrl,
                partialCount: finalSession?.chapters?.length || initialChapters.length,
                totalCount: finalSession?.totalChapterCount || 0
              });
            }
            toast(ctrl.pauseReason ? `⏸ ${ctrl.pauseReason}` : `⏸ Fetch paused. ${finalSession?.chapters?.length || data?.chapters?.length || initialChapters.length} chapters saved to Library.`, 'info');
            return;
          }

          if (ctrl?.isCancelled) {
            setIsFetchingPaused(false);
            setIsFetchingUrl(false);
            if (latestSessionSnapshot) {
              setActiveCrawlSession(latestSessionSnapshot);
              setWebImportData(latestSessionSnapshot);
            }
            toast(`✕ Fetch cancelled. Progress preserved in Library.`, 'warning');
            return;
          }

          // Fetch completed or returned
          if (data) {
            const totalExpected = data.totalChapterCount || (data.chapterList ? data.chapterList.length : (data.chapters ? data.chapters.length : (latestSessionSnapshot?.totalChapterCount || targetSession?.totalChapterCount || 0)));
            const isActuallyFinished = totalExpected > 0 ? (data.chapters.length >= totalExpected || (data.chapterList && data.chapterList.length > 0 && data.chapters.length >= data.chapterList.length)) : true;

            data.id = novelId;
            data.sourceUrl = data.sourceUrl || targetUrl;
            const completedCustomTitle = targetSession?.customTitle || getCustomTitle(targetUrl) || getCustomTitle(novelId) || targetSession?.title;
            if (completedCustomTitle) {
              data.title = completedCustomTitle;
              data.customTitle = completedCustomTitle;
            }
            data.cover = data.cover || (typeof stats !== 'undefined' ? stats?.cover : '') || targetSession?.cover || latestSessionSnapshot?.cover || '';
            const existingFolder = getNovelFolderOptions(data);
            data.folderTreeUri = data.folderTreeUri || targetSession?.folderTreeUri || latestSessionSnapshot?.folderTreeUri || existingFolder.treeUri || '';
            data.folderPath = data.folderPath || targetSession?.folderPath || latestSessionSnapshot?.folderPath || existingFolder.folderPath || '';
            data.isIncomplete = !isActuallyFinished;
            data.totalChapterCount = totalExpected || data.chapters.length;
            setWebImportData(data);
            saveNovelToHistory(data);

            if (isActuallyFinished) {
              localStorage.removeItem('gemini_active_crawl_session');
              setActiveCrawlSession(null);
              setIsFetchingPaused(false);
              setIsFetchingUrl(false);
              setWebImportStatus('');
              setWebImportError(null);
              toast(`Imported "${data.title}" — ${data.chapters.length} chapters! 🎉`, 'success');
              try {
                window.NativeBridge?.clearProgressNotification?.(true);
                window.NativeBridge?.showCompletionNotification?.('Novel Import Complete! 📥', `Imported "${data.title}" (${data.chapters.length} chapters).`);
              } catch (e) {}
              if (autoExportEpub && data.chapters && data.chapters.length > 0) {
                exportCleanLnoriEpub(data);
              }
            } else {
              // Not finished (e.g. rate limit, partial pause, or network interrupt) — retain active session
              window.NativeBridge?.clearProgressNotification?.(false);
              window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', `Saved ${data.chapters.length}/${totalExpected} chapters. Tap to resume.`);
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
              setActiveCrawlSession(partialSession);
              flushCrawlPersistence(partialSession);
              setIsFetchingPaused(true);
              setIsFetchingUrl(false);
              toast(`⚠️ Partial import: Saved ${data.chapters.length}/${totalExpected} chapters. Click "Resume Fetch" to continue.`, 'warning');
            }
          }
        } catch (err) {
          if (pendingSaveTimer) clearTimeout(pendingSaveTimer);
          if (latestSessionSnapshot) flushCrawlPersistence(latestSessionSnapshot);

          const ctrl = window.WebNovelImporter?.getActiveController?.();
          window.NativeBridge?.clearProgressNotification?.(false);
          if (ctrl?.isPaused) {
            setIsFetchingPaused(true);
            window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', 'Fetch paused. Progress saved.');
            toast(ctrl?.pauseReason || 'Fetch paused. Progress saved.', 'info');
          } else if (ctrl?.isCancelled) {
            setIsFetchingPaused(false);
            toast('Fetch cancelled.', 'warning');
          } else {
            console.error('Fetch novel error:', err);
            const partialCount = latestSessionSnapshot?.chapters?.length || targetSession?.chapters?.length || 0;
            const totalCount = latestSessionSnapshot?.totalChapterCount || targetSession?.totalChapterCount || 0;
            if (partialCount > 0) {
              setIsFetchingPaused(true);
            }
            setWebImportError({
              message: err.message || 'Failed to fetch remote novel.',
              isCloudflare: !!err.isCloudflare,
              challengeType: err.challengeType || null,
              targetUrl: err.targetUrl || targetUrl,
              partialCount,
              totalCount
            });
            if (err.isCloudflare) {
              toast('🛡️ Remote site has Cloudflare verification active.', 'warning');
            } else {
              toast('Failed to fetch URL: ' + err.message, 'error');
            }
          }
        } finally {
          setIsFetchingUrl(false);
          const ctrl = window.WebNovelImporter?.getActiveController?.();
          if (!ctrl?.isPaused) {
            try { window.NativeBridge?.releaseWakeLock?.(); } catch (e) {}
          }
        }
      };

      const handlePauseFetch = () => {
        window.WebNovelImporter?.pause?.();
        window.NativeBridge?.clearProgressNotification?.(false);
        window.NativeBridge?.showCompletionNotification?.('Novel Ingestion Paused ⏸', 'Fetch paused. Current progress saved.');
        try { window.NativeBridge?.releaseWakeLock?.(); } catch (e) {}
        setIsFetchingPaused(true);
        setIsFetchingUrl(false);
        setWebImportStatus('Pausing… progress saved.');
        toast('Pausing fetch… current progress has been saved.', 'info');
      };

      const handleCancelFetch = () => {
        window.WebNovelImporter?.cancel?.();
        window.NativeBridge?.clearProgressNotification?.(false);
        try { window.NativeBridge?.releaseWakeLock?.(); } catch (e) {}
        setIsFetchingPaused(false);
        setIsFetchingUrl(false);
        setWebImportStatus('');
        toast('Cancelled fetch. Progress has been preserved in Library.', 'warning');
      };

      const exportCleanLnoriEpub = async (novelData) => {
        if (!novelData || !novelData.chapters || novelData.chapters.length === 0) {
          toast('No chapters downloaded to export.', 'warning');
          return;
        }
        const chs = novelData.chapters;
        const novelTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(novelData.title, chs) : (novelData.title || 'Web Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        const novelAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(novelData.author) : (novelData.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
        const coverUrl = novelData.cover || (chs[0]?.content?.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/)?.[1]) || (chs[0]?.text?.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/)?.[1]) || '';

        try {
          const opts = typeof getEpubOptions === 'function' ? getEpubOptions({ novelId: novelData.id || novelData.sourceUrl || novelTitle }) : {};
          opts.hierarchicalToc = true;
          opts.cleanWebArtifacts = true;
          opts.includeImages = true;
          if (coverUrl) opts.coverUrl = coverUrl;

          const blob = await generateEpubFromChapters(chs, novelTitle, novelAuthor, 'en', (status, pct, elapsed) => {
            setEpubPackagingModal({ title: novelTitle, status, pct, elapsed });
          }, opts);

          const isInc = novelData.isIncomplete || (novelData.totalChapterCount && chs.length < novelData.totalChapterCount);
          const epubFileName = getEpubFileName(novelTitle, chs.length, isInc);
          await saveUniversalBlob(blob, epubFileName, 'application/epub+zip', false, getNovelFolderOptions(novelData));
          toast(`Clean Lnori EPUB downloaded! (${chs.length} chapters)`, 'success');
        } catch (e) {
          toast('EPUB export error: ' + e.message, 'error');
        } finally {
          setEpubPackagingModal(null);
        }
      };

      const handleLnoriDirectEpubDownload = async (targetUrl) => {
        const url = (targetUrl || webImportUrl || '').trim();
        if (!url) return toast('Please enter an Lnori URL', 'warning');
        if (url !== webImportUrl) setWebImportUrl(url);

        // Automatically ensure illustrations are enabled
        setScrapeImages(true);
        localStorage.setItem('scrapeImages', 'true');
        if (typeof window !== 'undefined') window.__scrapeImages = true;
        setEpubIncludeImages(true);
        localStorage.setItem('epubIncludeImages', 'true');

        // Check if novel data is already loaded in memory (activeCrawlSession or webImportData)
        const currentData = (activeCrawlSession?.chapters?.length >= (webImportData?.chapters?.length || 0))
          ? activeCrawlSession
          : (webImportData || activeCrawlSession);

        if (currentData && currentData.chapters && currentData.chapters.length > 0 &&
            (!url || currentData.sourceUrl === url || currentData.url === url || url === webImportUrl)) {
          toast('Novel already loaded — packaging clean EPUB…', 'info');
          return exportCleanLnoriEpub(currentData);
        }

        // Check if novel already exists in Library history
        const existingInHistory = (webImportHistory || []).find(h => (h.sourceUrl && h.sourceUrl === url) || (h.url && h.url === url));
        if (existingInHistory) {
          try {
            const full = await loadFullNovel(existingInHistory);
            if (full && full.chapters && full.chapters.length > 0 && !full.isIncomplete) {
              toast('Loaded from Library — packaging clean EPUB…', 'info');
              return exportCleanLnoriEpub(full);
            }
          } catch (_) {}
        }

        toast('Starting 1-click download for clean Lnori EPUB…', 'info');
        await handleStartFetch(false, null, true, url);
      };

      const resumeCrawlFromSession = async (sessionOrNovel) => {
        setActiveTab('web_importer');
        let full = sessionOrNovel;
        if (!full.rawChapters && !full.chapters) {
          const loaded = await loadFullNovel(sessionOrNovel);
          if (loaded) full = loaded;
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
        setWebImportUrl(sessionData.url || '');
        setActiveCrawlSession(sessionData);
        setWebImportData(sessionData);
        try { localStorage.setItem('gemini_active_crawl_session', JSON.stringify(sessionData)); } catch(e) {}
        handleStartFetch(true, sessionData);
      };

      const dismissCrawlSession = () => {
        localStorage.removeItem('gemini_active_crawl_session');
        setActiveCrawlSession(null);
        setIsFetchingPaused(false);
        toast('Crawl session dismissed.', 'info');
      };

      // --- Modal ---
      const confirmAction = (msg, cb) => { setModalMessage(msg); setModalCallback(() => () => { cb(); setShowModal(false) }); setShowModal(true) };

      // --- History (IndexedDB Unlimited Storage + LocalStorage Fallback) ---
      const addToHistory = async (src, tgt, prov, input, output, stats = null) => {
        try {
          const entry = {
            id: genId(),
            ts: new Date().toISOString(),
            srcLang: src,
            tgtLang: tgt,
            provider: prov,
            inputPreview: (input || '').substring(0, 200),
            outputPreview: (output || '').substring(0, 200),
            fullInput: input || '',
            fullOutput: output || '',
            stats
          };
          
          // 1. Unlimited storage in IndexedDB
          await dbPut('history', entry);

          // 2. React state update
          setHistory(prev => [entry, ...(prev || [])]);

          // 3. Fallback sync to localStorage
          try {
            const lightList = [entry, ...(history || []).slice(0, 9)].map(h => ({
              ...h,
              fullInput: (h.fullInput && h.fullInput.length > 3000) ? (h.fullInput.substring(0, 3000) + '...[Full text in IndexedDB]') : h.fullInput,
              fullOutput: (h.fullOutput && h.fullOutput.length > 3000) ? (h.fullOutput.substring(0, 3000) + '...[Full text in IndexedDB]') : h.fullOutput
            }));
            localStorage.setItem('translationHistory', JSON.stringify(lightList));
          } catch (e) {}

          // 4. Mirror translated books into the unified Library (one store)
          try {
            const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+)/;
            const chaps = [];
            let cur = null;
            for (const line of (output || '').split(/\r?\n/)) {
              const t = line.trim();
              if (heading.test(t)) { if (cur) chaps.push(cur); cur = { title: t, content: '' }; }
              else if (cur) cur.content += line + '\n';
              else if (t) cur = { title: 'Chapter 1', content: line + '\n' };
            }
            if (cur) chaps.push(cur);
            if (chaps.length >= 2) {
              const srcChaps = (chapters && chapters.length > 0)
                ? chapters.map((c, i) => ({ title: c.title || `Chapter ${i + 1}`, content: c.text || c.content || '', text: c.text || c.content || '' }))
                : null;
              await saveNovelToHistory({
                title: ((chaps[0].title || '').replace(heading, '') || 'Translated Book').trim() + ' (Translated)',
                author: 'Gemini Translator',
                isTranslated: true,
                chapters: chaps.map(c => ({ title: c.title, content: c.content.trim() })),
                originalChapters: srcChaps,
                originalText: input || ''
              });
            }
          } catch (e) {}
        } catch (e) {
          console.warn('History storage note:', e);
        }
      };

      const loadFromHistory = async entry => {
        let fullIn = entry.fullInput;
        let fullOut = entry.fullOutput;
        if (!fullIn || !fullOut || fullIn.includes('[Full text in IndexedDB]')) {
          const all = await dbGetAll('history');
          const found = (all || []).find(x => x.id === entry.id);
          if (found) {
            fullIn = found.fullInput || fullIn;
            fullOut = found.fullOutput || fullOut;
          }
        }
        setInputText(fullIn || '');
        setAssembledText(fullOut || '');
        setSrcLang(entry.srcLang || 'Auto-detect');
        setTgtLang(entry.tgtLang || 'English');
        if (fullIn) {
          const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|Chapter\s*\d+|CHAPTER\s*\d+)/;
          const parsed = [];
          let cur = null;
          for (const line of fullIn.split(/\r?\n/)) {
            const t = line.trim();
            if (heading.test(t)) { if (cur) parsed.push(cur); cur = { title: t, text: '', content: '' }; }
            else if (cur) { cur.content += line + '\n'; cur.text += line + '\n'; }
            else if (t) { cur = { title: 'Chapter 1', content: line + '\n', text: line + '\n' }; }
          }
          if (cur) parsed.push(cur);
          if (parsed.length > 1) {
            setChapters(parsed);
          }
        }
        setActiveTab('text');
        toast('Loaded translation from history!');
      };

      const clearHistory = () => {
        confirmAction('Clear all translation history?', async () => {
          await dbClear('history');
          setHistory([]);
          localStorage.setItem('translationHistory', '[]');
          toast('Translation history cleared.', 'info');
        });
      };

      const deleteHistoryItem = async (id) => {
        await dbDelete('history', id);
        const u = history.filter(h => h.id !== id);
        setHistory(u);
        try { localStorage.setItem('translationHistory', JSON.stringify(u.slice(0, 10))); } catch (e) {}
      };

      const exportHistoryJSON = async () => {
        try {
          let historyData = await dbGetAll('history');
          if (!historyData || historyData.length === 0) {
            historyData = (history && history.length > 0) ? history : (() => {
              try { return JSON.parse(localStorage.getItem('translationHistory') || '[]'); } catch (e) { return []; }
            })();
          }

          if (!historyData || historyData.length === 0) {
            return toast('No translation history to export.', 'warning');
          }

          const sorted = historyData.sort((a, b) => new Date(b.ts) - new Date(a.ts));
          const exportObj = {
            app: 'Gemini EPUB Translator',
            type: 'history_export',
            storageEngine: 'IndexedDB',
            version: VERSION,
            exportedAt: new Date().toISOString(),
            totalEntries: sorted.length,
            history: sorted
          };

          const jsonStr = JSON.stringify(exportObj, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const d = new Date().toISOString().slice(0, 10);
          await saveUniversalBlob(blob, `gemini_translation_history_${d}.json`, 'application/json');
          toast(`Exported ${sorted.length} history records (IndexedDB)!`, 'success');
        } catch (e) {
          toast('Export history error: ' + e.message, 'error');
        }
      };

      const exportSingleHistoryItem = async (entry) => {
        try {
          const title = `${(entry.tgtLang ? `${entry.srcLang || 'Auto'} to ${entry.tgtLang}` : 'Translation')}_${new Date(entry.ts).toISOString().slice(0, 10)}`;
          const content = `====================================================\nGEMINI TRANSLATION HISTORY ENTRY\nProvider: ${entry.provider || 'AI'}\nLanguage: ${entry.srcLang || 'Auto'} -> ${entry.tgtLang}\nDate: ${new Date(entry.ts).toLocaleString()}\nTokens: ${entry.stats?.totalTokens?.toLocaleString() || 'N/A'}\nCost: ${entry.stats?.cost || 'N/A'}\n====================================================\n\n[INPUT TEXT]:\n${entry.fullInput || entry.inputPreview || ''}\n\n====================================================\n[TRANSLATED OUTPUT]:\n${entry.fullOutput || entry.outputPreview || ''}\n`;
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const exportFileName = `${title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.txt`;
          await saveUniversalBlob(blob, exportFileName, 'text/plain');
          toast('History entry exported as .txt file!', 'success');
        } catch (e) {
          toast('Export item error: ' + e.message, 'error');
        }
      };

      // --- Translation ---
      const getTranslateOpts = (signal) => ({
        apiKey: provider === 'deepseek' ? deepseekKey : geminiKey,
        rotateApiKey,
        deepseekApiKey: deepseekKey,
        deeplApiKey: deeplKey,
        model: provider === 'deepseek'
          ? (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel)
          : (useCustomModel && customModel ? customModel : geminiModel),
        srcLang,
        tgtLang,
        glossary: terminology,
        instructions: customInstructions,
        genderLocks: (activeNovelView && activeNovelView.genderLocks) ? { ...genderLocks, ...activeNovelView.genderLocks } : genderLocks,
        smartGlossary,
        epubSmartQuotes,
        epubCleanWebArtifacts,
        enableThinking,
        strictModel: strictModel !== undefined ? strictModel : (localStorage.getItem('strictModel') !== 'false'),
        signal,
        provider,
        libreUrl
      });

      // --- HTML DOM Node Extraction Helper ---
      // Extracts all non-empty text nodes from a DOM element (supporting all CJK, Latin, symbols)
      const extractTextNodes = (element) => {
        const nodes = [];
        if (!element) return nodes;
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while (n = walk.nextNode()) {
          const parentTag = n.parentElement ? n.parentElement.tagName.toLowerCase() : '';
          if (parentTag === 'script' || parentTag === 'style' || parentTag === 'noscript') continue;
          if (n.nodeValue && n.nodeValue.trim().length > 0) {
            nodes.push(n);
          }
        }
        return nodes;
      };

      const handleTranslateText = async (resume = false) => {
        if (!inputText.trim()) return setError('Paste some text to translate.');
        let wakeLock = null;
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          try { navigator.wakeLock.request('screen').then(wl => { wakeLock = wl }).catch(() => {}); } catch(e) {}
        }
        const startTime = performance.now();
        setIsTranslating(true); setProgress(0); setProgressLabel(resume ? 'Resuming...' : 'Preparing...'); setError('');
        window.NativeBridge?.acquireWakeLock();
        window.NativeBridge?.showProgressNotification('Gemini Translator', resume ? 'Resuming translation...' : 'Starting text translation...', 0);
        if (!resume) { setAssembledText(''); setTranslatedChapters([]); }

        const ctrl = new AbortController(); abortRef.current = ctrl;
        const jobId = generateJobId(inputText);

        try {
          const opts = getTranslateOpts(ctrl.signal);
          const effectiveTerm = enableGlossary ? terminology : '';
          const chunks = splitChunks(inputText, effectiveTerm.length, smartGlossary);
          const isAIProvider = provider === 'gemini' || provider === 'deepseek';
          const useContext = contextAware && chunks.length > 1 && isAIProvider;
          const activeLocks = opts.genderLocks ? Object.keys(opts.genderLocks) : [];
          window.telemetryLog?.('TRANSLATE', `Initiating text translation (${inputText.length} chars, ${chunks.length} chunk${chunks.length > 1 ? 's' : ''})`, {
            model: opts.model,
            provider,
            srcLang: opts.srcLang,
            tgtLang: opts.tgtLang,
            chunksCount: chunks.length,
            genderLocksInjectedCount: activeLocks.length,
            genderLocksInjected: activeLocks.slice(0, 100),
            glossaryRulesCount: effectiveTerm ? effectiveTerm.split('\n').filter(l => l.trim() && !l.startsWith('#')).length : 0
          });

          const curSession = (resume ? (activeSessionRef.current || activeSession) : null);
          let result = curSession ? curSession.result : '';
          let ctx = curSession ? curSession.ctx : '';
          let startIndex = curSession ? (curSession.completedCount || 0) : 0;
          let totalPromptTokens = 0;
          let totalOutputTokens = 0;
          let totalTokensUsed = 0;
          let accumulatedBreakdown = {
            sourceTokens: 0,
            glossaryTokens: 0,
            genderTokens: 0,
            contextTokens: 0,
            systemTokens: 0
          };

          const saveState = async (res, c, count) => {
            const state = { id: jobId, type: 'text', title: 'Text Translation', result: res, ctx: c, completedCount: count, total: chunks.length, timestamp: Date.now() };
            try {
              if (res.length < 2000000) localStorage.setItem(jobId, JSON.stringify(state));
            } catch (e) {}
            activeSessionRef.current = state;
            setActiveSession(state);
            setSavedTranslationSession(state);
            if (window.GeminiNovelDB) {
              await window.GeminiNovelDB.saveTranslationSession(state);
            }
          };

          // Snapshot state immediately so pausing at any point captures the session
          await saveState(result, ctx, startIndex);

          if (isAIProvider && enableStreaming) {
            for (let i = startIndex; i < chunks.length; i++) {
              setProgressLabel(`Streaming chunk ${i + 1}/${chunks.length}${useContext ? ' (with context)' : ''}...`);
              const pct = Math.round(((i + 1) / chunks.length) * 100);
              window.NativeBridge?.showProgressNotification('Gemini Translator', `Chunk ${i + 1}/${chunks.length} (${pct}%)`, pct);
              window.NativeBridge?.haptic('milestone');
              let chunkResult = '';
              const onChunkStream = t => {
                if (chunkResult === '' && result !== '' && !result.endsWith('\n')) {
                  result += '\n\n';
                }
                chunkResult += t;
                result += t;
                setAssembledText(result);
              };
              const isLastChunk = i === chunks.length - 1;
              const hasIncomingContext = Boolean(ctx && ctx.trim());
              const shouldPassContext = useContext && (hasIncomingContext || i > 0);
              const shouldRequestUpdate = useContext && !isLastChunk;
              let streamRes = await streamWithRotation(chunks[i], {
                ...opts,
                context: shouldPassContext ? ctx : undefined,
                needContextUpdate: shouldRequestUpdate,
                onChunk: onChunkStream
              });
              // Fallback: if the context-memory pass returned no translation body, retry once without context
              if ((!chunkResult.trim() || (chunks[i].trim().length > 300 && chunkResult.trim().length < 100)) && useContext) {
                chunkResult = '';
                streamRes = await streamWithRotation(chunks[i], { ...opts, context: undefined, needContextUpdate: shouldRequestUpdate, onChunk: onChunkStream });
              }
              if (useContext) { ctx = streamRes.newContext || ctx; }
              if (streamRes?.usage) {
                totalPromptTokens += streamRes.usage.promptTokens || 0;
                totalOutputTokens += streamRes.usage.outputTokens || 0;
                totalTokensUsed += streamRes.usage.totalTokens || 0;
                if (streamRes.usage.breakdown) {
                  accumulatedBreakdown.sourceTokens += streamRes.usage.breakdown.sourceTokens || 0;
                  accumulatedBreakdown.glossaryTokens += streamRes.usage.breakdown.glossaryTokens || 0;
                  accumulatedBreakdown.genderTokens += streamRes.usage.breakdown.genderTokens || 0;
                  accumulatedBreakdown.contextTokens += streamRes.usage.breakdown.contextTokens || 0;
                  accumulatedBreakdown.systemTokens += streamRes.usage.breakdown.systemTokens || 0;
                }
              }
              setProgress(Math.floor(((i + 1) / chunks.length) * 100));
              saveState(result, ctx, i + 1);
            }
            result = stripContextLeak(result);
            if (!(result || '').trim()) throw new Error('Provider returned an empty stream. Check the selected model in Settings · Engine.');
            setTranslatedChapters([{ title: 'Translated Document', content: result }]);
            localStorage.removeItem(jobId); activeSessionRef.current = null; setActiveSession(null); setSavedTranslationSession(null); setIsTranslationPaused(false);
            if (window.GeminiNovelDB) { window.GeminiNovelDB.deleteTranslationSession(jobId); }
          } else if (useContext) {
            for (let i = startIndex; i < chunks.length; i++) {
              setProgressLabel(`Translating chunk ${i + 1}/${chunks.length} (with context)...`);
              let translated = null;
              const isLastChunk = i === chunks.length - 1;
              const hasIncomingContext = Boolean(ctx && ctx.trim());
              const shouldPassContext = useContext && (hasIncomingContext || i > 0);
              const shouldRequestUpdate = useContext && !isLastChunk;
              try {
                translated = await translateWithRotation(chunks[i], {
                  ...opts,
                  context: shouldPassContext ? ctx : undefined,
                  needContextUpdate: shouldRequestUpdate
                });
              } catch (err) {
                if (err.name === 'AbortError' || opts?.signal?.aborted) throw err;
                const isFatalQuota = (err.message || '').includes('429') || (err.message || '').includes('quota') || (err.message || '').includes('billing');
                if (isFatalQuota) {
                  throw new Error(`API Quota exhausted across keys. Switch model to Gemini 3.5 Flash Lite in Settings · Engine. Progress saved at chunk ${i + 1}/${chunks.length}.`);
                }
                if (opts?.strictModel) {
                  throw new Error(`Strict Model: Could not complete chunk ${i + 1}/${chunks.length} with ${opts.model || 'chosen model'}: ${err.message}. Progress safely preserved. Tap Resume to retry.`);
                }
                let recText = '';
                try {
                  const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
                  const fallbackLeased = (availableKeys?.length > 1) ? await KeyPool.acquireKey(availableKeys) : null;
                  const fallbackOpts = { ...opts, apiKey: fallbackLeased || opts.apiKey, context: undefined, needContextUpdate: false };
                  const recRes = await translateWithRotation(chunks[i], fallbackOpts);
                  if (fallbackLeased) KeyPool.releaseKey(fallbackLeased);
                  recText = (recRes && typeof recRes === 'object') ? (recRes.text || '') : (typeof recRes === 'string' ? recRes : '');
                } catch (recErr) {}
                if (recText && recText.trim()) {
                  translated = { text: recText };
                } else {
                  translated = { text: `\n\n[Error on chunk ${i + 1}: ${err.message}]\n\n` };
                }
              }
              result += (result ? '\n' : '') + (translated.text || translated);
              ctx = translated.newContext || ctx;
              if (translated?.usage) {
                totalPromptTokens += translated.usage.promptTokens || 0;
                totalOutputTokens += translated.usage.outputTokens || 0;
                totalTokensUsed += translated.usage.totalTokens || 0;
                if (translated.usage.breakdown) {
                  accumulatedBreakdown.sourceTokens += translated.usage.breakdown.sourceTokens || 0;
                  accumulatedBreakdown.glossaryTokens += translated.usage.breakdown.glossaryTokens || 0;
                  accumulatedBreakdown.genderTokens += translated.usage.breakdown.genderTokens || 0;
                  accumulatedBreakdown.contextTokens += translated.usage.breakdown.contextTokens || 0;
                  accumulatedBreakdown.systemTokens += translated.usage.breakdown.systemTokens || 0;
                }
              }
              setAssembledText(result.replace(/\r\n/g, '\n').trim());
              setProgress(Math.floor(((i + 1) / chunks.length) * 100));
              saveState(result, ctx, i + 1);
            }
            const final = stripContextLeak(result).replace(/\r\n/g, '\n').trim();
            if (!final) throw new Error('Provider returned an empty response. Check the selected model in Settings · Engine.');
            setAssembledText(final); setTranslatedChapters([{ title: 'Translated Document', content: final }]);
            localStorage.removeItem(jobId); setActiveSession(null);
          } else {
            // Parallel batch translation (no context)
            setProgressLabel(`Translating ${chunks.length - startIndex} remaining chunk(s) with ${Math.min(concurrency, chunks.length - startIndex)} parallel...`);
            let completed = startIndex;
            const remainingChunks = chunks.slice(startIndex);
            const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
            // User requested full parallel speed (up to 20 workers)
            const effectiveConcurrency = Math.max(1, concurrency || 3);
            const results = await batchParallel(remainingChunks, async (chunk, idx, workerId = 0) => {
              const workerKey = availableKeys.length > 0 ? availableKeys[workerId % availableKeys.length].key : opts.apiKey;
              const workerOpts = { ...opts, apiKey: workerKey, availableKeys, isParallelWorker: effectiveConcurrency > 1 };
              const translated = await translateWithRotation(chunk, workerOpts);
              completed++; setProgress(Math.floor((completed / chunks.length) * 100));
              setProgressLabel(`Completed ${completed}/${chunks.length} chunks`);
              saveState(result + (result ? '\n' : '') + '[Partial Parallel Completion]', '', completed);
              return translated;
            }, effectiveConcurrency, opts.signal);

            if (opts?.strictModel) {
              const failedItem = results.find(r => r?.error || (!r?.text && typeof r !== 'string'));
              if (failedItem) {
                throw new Error(`Strict Model: A chunk encountered an issue ("${failedItem.error || 'empty response'}"). Progress safely saved at ${completed}/${chunks.length}. Tap Resume to retry.`);
              }
            }

            results.forEach(r => {
              if (r?.usage) {
                totalPromptTokens += r.usage.promptTokens || 0;
                totalOutputTokens += r.usage.outputTokens || 0;
                totalTokensUsed += r.usage.totalTokens || 0;
                if (r.usage.breakdown) {
                  accumulatedBreakdown.sourceTokens += r.usage.breakdown.sourceTokens || 0;
                  accumulatedBreakdown.glossaryTokens += r.usage.breakdown.glossaryTokens || 0;
                  accumulatedBreakdown.genderTokens += r.usage.breakdown.genderTokens || 0;
                  accumulatedBreakdown.contextTokens += r.usage.breakdown.contextTokens || 0;
                  accumulatedBreakdown.systemTokens += r.usage.breakdown.systemTokens || 0;
                }
              }
            });

            const translated = results.map(r => typeof r === 'string' ? r : (r?.text ? r.text : (r?.error ? `\n\n[Error: ${r.error}]\n\n` : '')));
            const combinedNew = cleanNovelProse(translated.join('\n\n').replace(/\r\n/g, '\n')).trim();
            result = stripContextLeak(result ? result + '\n\n' + combinedNew : combinedNew);

            setAssembledText(result); setTranslatedChapters([{ title: 'Translated Document', content: result }]);
            localStorage.removeItem(jobId); activeSessionRef.current = null; setActiveSession(null); setSavedTranslationSession(null); setIsTranslationPaused(false);
            if (window.GeminiNovelDB) { window.GeminiNovelDB.deleteTranslationSession(jobId); }

            // Anti-MTL Quality Gate & Proofreader Check (§7.5 + §5.9)
            if (antiMtlGateEnabled && window.QAEngine && result) {
              const refCheck = window.QAEngine.checkMtlRefusal(result);
              const loopCheck = window.QAEngine.checkRepetitionLoop(result);
              window.telemetryLog?.('ANTI_MTL', `Text translation quality audit: ${refCheck.hasRefusal ? `⚠️ Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `⚠️ Loop [${loopCheck.phrase}]` : 'Clean Pass ✅'}`, {
                hasRefusal: refCheck.hasRefusal,
                refusalPattern: refCheck.patternName || null,
                hasLoop: loopCheck.hasLoop,
                loopPhrase: loopCheck.phrase || null
              });
              if (refCheck.hasRefusal) {
                toast(`⚠️ Anti-MTL Gate: ${refCheck.patternName} detected in translation`, 'warning');
              } else if (loopCheck.hasLoop) {
                toast(`⚠️ QA Proofreader: Hallucinated repetition loop detected`, 'warning');
              }
            }

            // Translation Revision Snapshot (§8.6)
            if (snapshotsEnabled && window.TMDiffEngine && result) {
              const novelKey = (activeNovelRecord && activeNovelRecord.id) || (fileName && fileName.trim()) || 'active_doc';
              const activeM = provider === 'deepseek'
                ? (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel)
                : (useCustomModel && customModel ? customModel : geminiModel);
              window.TMDiffEngine.Snapshots.createSnapshot({
                novelId: novelKey,
                chapterIdx: 0,
                chapterTitle: (fileName && fileName.trim()) || 'Translated Document',
                text: result,
                model: activeM || 'Gemini'
              }).catch(e => console.warn('[Snapshots] Single text snapshot error:', e));
            }
          }

          const elapsedMs = performance.now() - startTime;
          const durationStr = formatDuration(elapsedMs);
          const totalToks = totalTokensUsed || (totalPromptTokens + totalOutputTokens);
          const tokPerSec = elapsedMs > 0 && totalToks ? Math.round((totalToks / (elapsedMs / 1000))) : 0;

          const activeM = provider === 'deepseek'
            ? (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel)
            : (useCustomModel && customModel ? customModel : geminiModel);
          const finalCost = calculateRealCost(totalPromptTokens, totalOutputTokens, activeM, provider);
          const finalBreakdown = totalPromptTokens > 0 ? {
            sourceTokens: accumulatedBreakdown.sourceTokens,
            glossaryTokens: accumulatedBreakdown.glossaryTokens,
            genderTokens: accumulatedBreakdown.genderTokens,
            contextTokens: accumulatedBreakdown.contextTokens,
            systemTokens: accumulatedBreakdown.systemTokens,
            sourcePct: ((accumulatedBreakdown.sourceTokens / totalPromptTokens) * 100).toFixed(1),
            glossaryPct: ((accumulatedBreakdown.glossaryTokens / totalPromptTokens) * 100).toFixed(1),
            genderPct: ((accumulatedBreakdown.genderTokens / totalPromptTokens) * 100).toFixed(1),
            contextPct: ((accumulatedBreakdown.contextTokens / totalPromptTokens) * 100).toFixed(1),
            systemPct: ((accumulatedBreakdown.systemTokens / totalPromptTokens) * 100).toFixed(1)
          } : null;

          const stats = {
            promptTokens: totalPromptTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalToks,
            cost: finalCost,
            duration: durationStr,
            durationMs: elapsedMs,
            speed: tokPerSec ? `${tokPerSec} tok/s` : '',
            model: activeM,
            provider,
            enableStreaming: Boolean(enableStreaming),
            enableThinking: Boolean(enableThinking),
            strictModel: Boolean(strictModel),
            contextAware: Boolean(contextAware),
            concurrency: Number(concurrency || 1),
            chunkSizePreset: String(chunkSizePreset || 'turbo'),
            smartGlossary: Boolean(smartGlossary),
            glossaryTermCount: Number(glossaryTermCount || 0),
            hasGlossary: Boolean(terminology && terminology.trim()),
            hasInstructions: Boolean(customInstructions && customInstructions.trim()),
            breakdown: finalBreakdown
          };
          setLastUsageStats(stats);
          if (finalBreakdown) {
            window.telemetryLog?.('TOKEN_BREAKDOWN', `Token Consumption Breakdown: ${totalPromptTokens.toLocaleString()} in (${finalBreakdown.glossaryTokens.toLocaleString()} glossary · ${finalBreakdown.sourceTokens.toLocaleString()} source · ${finalBreakdown.genderTokens.toLocaleString()} gender · ${finalBreakdown.systemTokens.toLocaleString()} system) + ${totalOutputTokens.toLocaleString()} out`, {
              totalTokens: totalToks,
              promptTokens: totalPromptTokens,
              outputTokens: totalOutputTokens,
              breakdown: finalBreakdown
            });
          }
          window.sendTelemetry?.('REPORT', '\n' + getReportSummaryText(stats));
          addToHistory(srcLang, tgtLang, provider, inputText, result, stats);
          toast(`Translation complete in ${durationStr}! (${stats.totalTokens.toLocaleString()} tokens · ${finalCost})`);
          try {
            window.NativeBridge?.releaseWakeLock?.();
            window.NativeBridge?.showCompletionNotification?.('Text Translation Complete! ✨', `Translated in ${durationStr} (${stats.totalTokens.toLocaleString()} tokens).`);
          } catch(e) {}
        } catch (e) {
          if (e.name !== 'AbortError') { setError(e.message); toast(e.message, 'error'); }
          else {
            setIsTranslationPaused(true);
            const session = activeSessionRef.current || activeSession;
            if (session) {
              setSavedTranslationSession(session);
            } else if (window.GeminiNovelDB) {
              window.GeminiNovelDB.getActiveTranslationSession().then(s => {
                if (s) setSavedTranslationSession(s);
              });
            }
            toast('Translation paused. Progress safely saved.', 'info');
          }
        }
        finally {
          if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
          setIsTranslating(false);
          if (!isPausingRef.current) {
            setProgress(0);
            setProgressLabel('');
            try { window.NativeBridge?.releaseWakeLock?.(); } catch(e) {}
          }
          abortRef.current = null;
          isPausingRef.current = false;
        }
      };

      const handleTranslateEbook = async (chapters, resume = false, isEpubParam = false, originalZipParam = null) => {
        let wakeLock = null;
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          try { navigator.wakeLock.request('screen').then(wl => { wakeLock = wl }).catch(() => {}); } catch(e) {}
        }
        const startTime = performance.now();
        setIsTranslating(true); setProgress(0); setError('');
        window.NativeBridge?.acquireWakeLock();
        window.NativeBridge?.showProgressNotification('Gemini Ebook Translator', resume ? 'Resuming book...' : 'Analyzing chapters...', 0);
        if (!resume) { setAssembledText(''); setTranslatedChapters([]); }

        const isEpub = isEpubParam || currentIsEpub;
        const originalZip = originalZipParam || currentOriginalZip || window.currentTranslatedZip || null;
        if (isEpub) setCurrentIsEpub(true);
        if (originalZip) { setCurrentOriginalZip(originalZip); window.currentTranslatedZip = originalZip; }

        const ctrl = new AbortController(); abortRef.current = ctrl;
        const opts = getTranslateOpts(ctrl.signal);
        const useContext = contextAware && (provider === 'gemini' || provider === 'deepseek');
        const curSession = (resume ? (activeSessionRef.current || activeSession) : null);
        let ctx = curSession ? curSession.ctx : '';
        let done = curSession ? (curSession.completedCount || 0) : 0;
        let totalPromptTokens = 0;
        let totalOutputTokens = 0;
        let totalTokensUsed = 0;
        let accumulatedBreakdown = {
          sourceTokens: 0,
          glossaryTokens: 0,
          genderTokens: 0,
          contextTokens: 0,
          systemTokens: 0
        };

        const allParts = curSession ? [...curSession.allParts] : [];
        const newChapters = curSession ? [...curSession.newChapters] : [];
        const startChapterIdx = curSession ? (curSession.currentChapterIdx || 0) : 0;
        const startChunkIdx = curSession ? (curSession.currentChunkIdx || 0) : 0;

        const bookTitle = (chapters && chapters[0]?.title && !isGenericTitle(chapters[0].title))
          ? chapters[0].title
          : ((fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || 'Web Novel');
        const jobId = currentFileHash || ('job_' + String(bookTitle).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) + '_' + chapters.length);

        const activeLocks = opts.genderLocks ? Object.keys(opts.genderLocks) : [];
        window.telemetryLog?.('TRANSLATE', `Started eBook translation: "${bookTitle}" (${chapters.length} chapters, isEpub=${isEpub})`, {
          bookTitle,
          totalChapters: chapters.length,
          model: opts.model,
          provider,
          srcLang: opts.srcLang,
          tgtLang: opts.tgtLang,
          resume,
          activeGenderLocksCount: activeLocks.length,
          activeGenderLocks: activeLocks.slice(0, 100),
          glossaryRulesCount: opts.glossary ? opts.glossary.split('\n').filter(l => l.trim() && !l.startsWith('#')).length : 0,
          translationMemoryEnabled: !!translationMemoryEnabled,
          antiMtlGateEnabled: !!antiMtlGateEnabled
        });
        let lastUiAssembledUpdate = performance.now();
        let totalChunks = 0;

        try {
          // Disambiguate duplicate adjacent chapter titles in chapters array (e.g. AO3 summary block vs story chapter)
          for (let idx = 0; idx < chapters.length - 1; idx++) {
            const cur = chapters[idx];
            const next = chapters[idx + 1];
            const curTitle = (cur?.title || '').trim().toLowerCase();
            const nextTitle = (next?.title || '').trim().toLowerCase();
            if (curTitle && curTitle === nextTitle) {
              const curText = (typeof cur === 'string' ? cur : (cur?.text || cur?.content || ''));
              const curIsSummary = /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|简介|内容简介|前言)[:：\s]/i.test(curText);
              if (curIsSummary) {
                if (typeof cur === 'object') cur.title = 'Summary';
              }
            }
          }

          // Prepare chapter chunks with clean paragraph boundary splitting
          const chapterData = chapters.map(c => {
            const effectiveTerm = enableGlossary ? terminology : '';
            let chapterText = (typeof c === 'string' ? c : (c?.text || c?.content || ''));
            const chapterTitle = (typeof c === 'object' && c?.title) ? String(c.title).trim() : '';
            const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
            if (typeof stripFn === 'function' && chapterTitle) {
              chapterText = stripFn(chapterText, chapterTitle, c?.originalTitle);
            }
            const ch = splitChunks(chapterText, effectiveTerm.length, smartGlossary);
            totalChunks += ch.length;
            if (chapterTitle) totalChunks++;
            return { title: chapterTitle, chunks: ch.map(text => ({ text })), doc: c?.doc, zipPath: c?.zipPath };
          });

          if (resume && newChapters.length > 0) {
            done = 0;
            newChapters.forEach((nc, idx) => {
              if (nc && nc.content) {
                done += (chapterData[idx]?.chunks?.length || 1) + (chapterData[idx]?.title?.trim() ? 1 : 0);
              }
            });
          }

          const saveState = async (c, count, chIdx, ckIdx, ap, nc) => {
            const state = {
              id: jobId,
              type: 'ebook',
              title: bookTitle,
              ctx: c,
              completedCount: count,
              currentChapterIdx: chIdx,
              currentChunkIdx: ckIdx,
              allParts: ap,
              newChapters: nc,
              totalChunks,
              chapters: (chapters || []).map((c, i) => ({ title: c?.title || `Chapter ${i + 1}`, text: c?.text || c?.content || '' })),
              isEpub,
              cover: currentDocCover || activeNovelRecord?.cover || curSession?.cover || '',
              novelRecord: activeNovelRecord || curSession?.novelRecord || null,
              timestamp: Date.now(),
              isDeltaUpdate: Boolean(curSession?.isDeltaUpdate),
              deltaStart: curSession?.deltaStart,
              deltaEnd: curSession?.deltaEnd,
              novelId: curSession?.novelId
            };
            try {
              const sStr = JSON.stringify(state);
              if (sStr.length < 2000000) localStorage.setItem(jobId, sStr);
            } catch(e) {}
            activeSessionRef.current = state;
            setActiveSession(state);
            setSavedTranslationSession(state);
            if (window.GeminiNovelDB) {
              await window.GeminiNovelDB.saveTranslationSession(state);
            }
          };

          // Snapshot state immediately at millisecond zero so pausing during chapter 1 never yields null
          await saveState(ctx, done, startChapterIdx, startChunkIdx, allParts, newChapters);

          const chapterItems = chapterData.map((ch, idx) => ({ ch, idx })).filter(({ idx }) => {
            if (!resume) return true;
            return !newChapters[idx] || !newChapters[idx].content;
          });

          if (chapterItems.length === 0) {
            toast('All chapters are already translated!', 'success');
            setIsTranslating(false);
            return;
          }

          const availableKeys = (apiKeysByProvider[provider] || []).filter(k => k.key && k.key.trim());
          // User requested full parallel speed (up to 20 workers)
          const effectiveConcurrency = Math.max(1, concurrency || 3);
          const translatedTitleCache = new Map();

          setProgress(Math.floor((done / totalChunks) * 100));
          setProgressLabel(`Translating ${chapterItems.length} chapter(s) with ${Math.min(effectiveConcurrency, chapterItems.length)} parallel multi-key stream(s)${useContext ? ' (intra-chapter context)' : ''}...`);

          await batchParallel(chapterItems, async ({ ch, idx: i }, itemIdx, workerId = 0) => {
            const workerKey = availableKeys.length > 0 ? availableKeys[workerId % availableKeys.length].key : opts.apiKey;
            const workerOpts = { ...opts, apiKey: workerKey, availableKeys, isParallelWorker: effectiveConcurrency > 1 };
            let title = ch.title;
            const chunks = ch.chunks;
            let chapterCtx = '';

            // 1. Translate title if needed (cached so duplicate chapter titles match exactly)
            if (title && String(title).trim()) {
              if (!(resume && newChapters[i]?.title)) {
                if (translatedTitleCache.has(title)) {
                  title = translatedTitleCache.get(title);
                } else {
                  try {
                    const hasCjk = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(title);
                    if (!hasCjk) {
                      translatedTitleCache.set(title, title.trim());
                    } else {
                      const titleWorkerOpts = {
                        ...workerOpts,
                        context: undefined,
                        needContextUpdate: false,
                        glossary: '', // Titles are 1-10 words; omitting huge story glossary saves ~2,100 tokens per title!
                        smartGlossary: false,
                        instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
                      };
                      const tRes = await translateWithRotation(title, titleWorkerOpts);
                      const trans = (tRes && typeof tRes === 'object') ? (tRes.text || '') : (typeof tRes === 'string' ? tRes : '');
                      if (trans && trans.trim()) {
                        const cleanT = (typeof window !== 'undefined' && window.sanitizeChapterTitle) ? window.sanitizeChapterTitle(trans.trim()) : trans.trim();
                        translatedTitleCache.set(title, cleanT);
                        title = cleanT;
                      }
                      if (tRes?.usage) {
                        totalPromptTokens += tRes.usage.promptTokens || 0;
                        totalOutputTokens += tRes.usage.outputTokens || 0;
                        totalTokensUsed += tRes.usage.totalTokens || 0;
                        if (tRes.usage.breakdown) {
                          accumulatedBreakdown.sourceTokens += tRes.usage.breakdown.sourceTokens || 0;
                          accumulatedBreakdown.glossaryTokens += tRes.usage.breakdown.glossaryTokens || 0;
                          accumulatedBreakdown.genderTokens += tRes.usage.breakdown.genderTokens || 0;
                          accumulatedBreakdown.contextTokens += tRes.usage.breakdown.contextTokens || 0;
                          accumulatedBreakdown.systemTokens += tRes.usage.breakdown.systemTokens || 0;
                        }
                      }
                    }
                  } catch (e) { console.warn('Title translation failed, keeping original title for now:', e.message); }
                }
                done++;
                const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
                setProgress(curPct);
                window.NativeBridge?.showProgressNotification(
                  `Gemini Translator (${curPct}%)`,
                  `Ch. ${i + 1}/${chapters.length}: Title standardized`,
                  curPct,
                  true
                );
              } else {
                title = newChapters[i].title;
              }
            }

            // 2. Translate Chunks with Intra-Chapter Context Pipeline
            const parts = [];
            for (let j = 0; j < chunks.length; j++) {
              setProgressLabel(`Chapter ${i + 1}/${chapters.length}: chunk ${j + 1}/${chunks.length}${useContext ? ' (intra-context)' : ''}...`);
              let translatedText = '';
              const isLastChunk = j === chunks.length - 1;
              const hasIncomingContext = Boolean(chapterCtx && chapterCtx.trim());
              const shouldPassContext = useContext && (hasIncomingContext || j > 0);
              const shouldRequestUpdate = useContext && !isLastChunk;
              try {
                const translated = await translateWithRotation(chunks[j].text, {
                  ...workerOpts,
                  context: shouldPassContext ? chapterCtx : undefined,
                  needContextUpdate: shouldRequestUpdate
                });
                translatedText = (translated && typeof translated === 'object') ? (translated.text || '') : (typeof translated === 'string' ? translated : '');
                if (useContext && translated?.newContext) {
                  chapterCtx = translated.newContext;
                }
                if (translated?.usage) {
                  totalPromptTokens += translated.usage.promptTokens || 0;
                  totalOutputTokens += translated.usage.outputTokens || 0;
                  totalTokensUsed += translated.usage.totalTokens || 0;
                  if (translated.usage.breakdown) {
                    accumulatedBreakdown.sourceTokens += translated.usage.breakdown.sourceTokens || 0;
                    accumulatedBreakdown.glossaryTokens += translated.usage.breakdown.glossaryTokens || 0;
                    accumulatedBreakdown.genderTokens += translated.usage.breakdown.genderTokens || 0;
                    accumulatedBreakdown.contextTokens += translated.usage.breakdown.contextTokens || 0;
                    accumulatedBreakdown.systemTokens += translated.usage.breakdown.systemTokens || 0;
                  }
                }
              } catch (e) {
                if (e.name === 'AbortError' || opts?.signal?.aborted) throw e;
                const isFatalQuota = (e.message || '').includes('429') || (e.message || '').includes('quota') || (e.message || '').includes('billing');
                if (isFatalQuota) {
                  throw new Error(`API Quota exhausted across keys. Switch model to Gemini 3.5 Flash Lite in Settings · Engine. Progress saved at chapter ${i + 1}.`);
                }
                if (opts?.strictModel) {
                  throw new Error(`Strict Model: Failed translating chunk ${j + 1}/${chunks.length} of "${title || `Chapter ${i + 1}`}": ${e.message}. Progress safely saved. Tap Resume to retry.`);
                }
                // When strictModel is OFF, attempt one fresh-key fallback before writing error placeholder
                let recovered = false;
                try {
                  const fallbackLeased = (availableKeys.length > 1) ? await KeyPool.acquireKey(availableKeys) : null;
                  const fallbackOpts = { ...workerOpts, apiKey: fallbackLeased || workerOpts.apiKey, context: undefined, needContextUpdate: false };
                  const recRes = await translateWithRotation(chunks[j].text, fallbackOpts);
                  if (fallbackLeased) KeyPool.releaseKey(fallbackLeased);
                  const recText = (recRes && typeof recRes === 'object') ? (recRes.text || '') : (typeof recRes === 'string' ? recRes : '');
                  if (recText && recText.trim()) {
                    translatedText = recText;
                    recovered = true;
                  }
                } catch (recErr) {
                  console.warn(`Chunk fallback recovery failed: ${recErr.message}`);
                }
                if (!recovered) {
                  translatedText = `\n\n[Error: ${e.message}]\n\n`;
                }
              }
              parts.push(translatedText);
              
              // Live update output box throttled or on chapter completion
              allParts[i] = `${title}\n\n${parts.join('\n\n')}`;
              const nowTime = performance.now();
              if (nowTime - lastUiAssembledUpdate > 2500 || j === chunks.length - 1) {
                lastUiAssembledUpdate = nowTime;
                const liveText = allParts.filter(Boolean).join('\n\n\n').trim();
                setAssembledText(liveText);
              }

              done++;
              const curPct = Math.min(99, Math.floor((done / totalChunks) * 100));
              setProgress(curPct);
              const chTitleClean = (title || `Chapter ${i + 1}`).trim().slice(0, 30);
              window.NativeBridge?.showProgressNotification(
                `Gemini Translator (${curPct}%)`,
                `Ch. ${i + 1}/${chapters.length} (chunk ${j + 1}/${chunks.length}) • ${chTitleClean}`,
                curPct,
                true
              );
            }

            let content = cleanNovelProse(stripContextLeak(parts.join('\n\n')).replace(/\r\n/g, '\n')).trim();
            const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
            if (typeof stripFn === 'function' && title) {
              content = stripFn(content, title, chapters[i]?.title);
            }

            // Anti-MTL Quality Gate & Proofreader Check (§7.5 + §5.9)
            if (antiMtlGateEnabled && window.QAEngine && content) {
              const refCheck = window.QAEngine.checkMtlRefusal(content);
              const loopCheck = window.QAEngine.checkRepetitionLoop(content);
              window.telemetryLog?.('ANTI_MTL', `Chapter ${i + 1} quality audit: ${refCheck.hasRefusal ? `⚠️ Refusal [${refCheck.patternName}]` : loopCheck.hasLoop ? `⚠️ Loop [${loopCheck.phrase}]` : 'Clean Pass ✅'}`, {
                chapterIndex: i + 1,
                hasRefusal: refCheck.hasRefusal,
                refusalPattern: refCheck.patternName || null,
                hasLoop: loopCheck.hasLoop,
                loopPhrase: loopCheck.phrase || null
              });
              if (refCheck.hasRefusal) {
                console.warn(`[Anti-MTL Gate] Chapter ${i + 1}:`, refCheck.matchedText);
                toast(`⚠️ Anti-MTL Gate: ${refCheck.patternName} detected in Ch. ${i + 1}`, 'warning');
              } else if (loopCheck.hasLoop) {
                console.warn(`[QA Proofreader] Chapter ${i + 1}:`, loopCheck.phrase);
                toast(`⚠️ QA Proofreader: Repetition loop detected in Ch. ${i + 1}`, 'warning');
              }
            }

            let docHtml = null;
            if (isEpub && ch.doc) {
              if (title && ch.doc.querySelector('title')) ch.doc.querySelector('title').textContent = title;
              
              // Format clean HTML paragraphs into the EPUB chapter body
              const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              if (lines.length > 0) {
                const titleHeading = (title && !isGenericTitle(title)) ? `<h2>${escapeXml(title)}</h2>\n` : '';
                const bodyParagraphs = lines.map(line => {
                  if (/^(\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(line)) {
                    return `<p class="divider">${escapeXml(line)}</p>`;
                  }
                  return `<p>${escapeXml(line)}</p>`;
                }).join('\n');
                ch.doc.body.innerHTML = `${titleHeading}${bodyParagraphs}`;
              }
              
              docHtml = ch.doc.documentElement.outerHTML;
              if (originalZip && ch.zipPath) originalZip.file(ch.zipPath, docHtml);
            }

            // Translation Revision Snapshot (§8.6)
            if (snapshotsEnabled && window.TMDiffEngine && content) {
              const novelKey = (activeNovelRecord && activeNovelRecord.id) || (fileName && fileName.trim()) || 'active_doc';
              window.TMDiffEngine.Snapshots.createSnapshot({
                novelId: novelKey,
                chapterIdx: i,
                chapterTitle: title || chapters[i]?.title || `Chapter ${i + 1}`,
                text: content,
                model: workerOpts?.model || model || 'Gemini'
              }).catch(e => console.warn('[Snapshots] Auto-save error:', e));
            }

            newChapters[i] = { originalTitle: chapters[i].title, title, content, zipPath: ch.zipPath, docHtml };
            allParts[i] = `${title}\n\n${content}`;
            
            // Live UI state update for partial preview, copy, and download
            const currentAssembled = allParts.filter(Boolean).join('\n\n\n').trim();
            setAssembledText(currentAssembled);
            setTranslatedChapters([...newChapters]);
            saveState(chapterCtx, done, i + 1, 0, allParts, newChapters);
          }, effectiveConcurrency, opts.signal);

          // Title Healing Pass: Ensure zero chapters are left with raw untranslated CJK titles
          const hasCjkTitle = s => /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(s || '');
          const untranslatedTitles = newChapters
            .map((nc, idx) => ({ nc, idx }))
            .filter(({ nc }) => nc && hasCjkTitle(nc.title));

          if (untranslatedTitles.length > 0 && !opts.signal?.aborted) {
            console.log(`[Title Healing] Found ${untranslatedTitles.length} untranslated title(s). Running healing pass...`);
            setProgressLabel(`Healing ${untranslatedTitles.length} untranslated chapter title(s)...`);
            for (const { nc, idx } of untranslatedTitles) {
              if (opts.signal?.aborted) break;
              try {
                const hRes = await translateWithRotation(nc.title, {
                  ...opts,
                  context: undefined,
                  needContextUpdate: false,
                  glossary: '',
                  smartGlossary: false,
                  instructions: 'Translate this novel chapter title accurately and concisely into English. Output ONLY the translated title, without quotes or markdown formatting.'
                });
                const hTrans = (hRes && typeof hRes === 'object') ? (hRes.text || '') : (typeof hRes === 'string' ? hRes : '');
                if (hTrans && hTrans.trim()) {
                  nc.title = hTrans.trim();
                  allParts[idx] = `${nc.title}\n\n${nc.content}`;
                }
              } catch (hErr) {
                console.warn(`[Title Healing] Failed for Ch. ${idx + 1}:`, hErr.message);
              }
            }
          }

          if (isEpub && originalZip) {
            window.currentTranslatedZip = originalZip;
          }
          setTranslatedChapters(newChapters); const final = stripContextLeak(allParts.join('\n\n\n')).trim(); setAssembledText(final);
          
          const elapsedMs = performance.now() - startTime;
          const durationStr = formatDuration(elapsedMs);
          const totalToks = totalTokensUsed || (totalPromptTokens + totalOutputTokens);
          const tokPerSec = elapsedMs > 0 && totalToks ? Math.round((totalToks / (elapsedMs / 1000))) : 0;

          const activeM = provider === 'deepseek'
            ? (useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : deepseekModel)
            : (useCustomModel && customModel ? customModel : geminiModel);
          const finalCost = calculateRealCost(totalPromptTokens, totalOutputTokens, activeM, provider);
          const finalBreakdown = totalPromptTokens > 0 ? {
            sourceTokens: accumulatedBreakdown.sourceTokens,
            glossaryTokens: accumulatedBreakdown.glossaryTokens,
            genderTokens: accumulatedBreakdown.genderTokens,
            contextTokens: accumulatedBreakdown.contextTokens,
            systemTokens: accumulatedBreakdown.systemTokens,
            sourcePct: ((accumulatedBreakdown.sourceTokens / totalPromptTokens) * 100).toFixed(1),
            glossaryPct: ((accumulatedBreakdown.glossaryTokens / totalPromptTokens) * 100).toFixed(1),
            genderPct: ((accumulatedBreakdown.genderTokens / totalPromptTokens) * 100).toFixed(1),
            contextPct: ((accumulatedBreakdown.contextTokens / totalPromptTokens) * 100).toFixed(1),
            systemPct: ((accumulatedBreakdown.systemTokens / totalPromptTokens) * 100).toFixed(1)
          } : null;

          const stats = {
            promptTokens: totalPromptTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalToks,
            cost: finalCost,
            duration: durationStr,
            durationMs: elapsedMs,
            speed: tokPerSec ? `${tokPerSec} tok/s` : '',
            model: activeM,
            provider,
            enableStreaming: Boolean(enableStreaming),
            enableThinking: Boolean(enableThinking),
            strictModel: Boolean(strictModel),
            contextAware: Boolean(contextAware),
            concurrency: Number(concurrency || 1),
            chunkSizePreset: String(chunkSizePreset || 'turbo'),
            smartGlossary: Boolean(smartGlossary),
            glossaryTermCount: Number(glossaryTermCount || 0),
            hasGlossary: Boolean(terminology && terminology.trim()),
            hasInstructions: Boolean(customInstructions && customInstructions.trim()),
            breakdown: finalBreakdown
          };
          setLastUsageStats(stats);
          if (finalBreakdown) {
            window.telemetryLog?.('TOKEN_BREAKDOWN', `Token Consumption Breakdown: ${totalPromptTokens.toLocaleString()} in (${finalBreakdown.glossaryTokens.toLocaleString()} glossary · ${finalBreakdown.sourceTokens.toLocaleString()} source · ${finalBreakdown.genderTokens.toLocaleString()} gender · ${finalBreakdown.systemTokens.toLocaleString()} system) + ${totalOutputTokens.toLocaleString()} out`, {
              totalTokens: totalToks,
              promptTokens: totalPromptTokens,
              outputTokens: totalOutputTokens,
              breakdown: finalBreakdown
            });
          }
          window.sendTelemetry?.('REPORT', '\n' + getReportSummaryText(stats));
          addToHistory(srcLang, tgtLang, provider, inputText || (chapters || []).map(c => c.text).join('\n\n'), final, stats);
          if (newChapters && newChapters.length > 0) {
            const mappedTranslated = newChapters.map((nc, idx) => ({
              title: nc?.title || (chapters && chapters[idx]?.title) || `Chapter ${idx + 1}`,
              text: nc?.content || nc?.text || (chapters && (chapters[idx]?.text || chapters[idx]?.content)) || '',
              content: nc?.content || nc?.text || (chapters && (chapters[idx]?.content || chapters[idx]?.text)) || ''
            }));
            const srcChaps = (chapters || []).map((c, idx) => ({
              title: c?.title || `Chapter ${idx + 1}`,
              text: typeof c === 'string' ? c : (c?.text || c?.content || ''),
              content: typeof c === 'string' ? c : (c?.content || c?.text || '')
            }));

            if (activeNovelRecord && activeNovelRecord.id) {
              const cleanBT = String(activeNovelRecord.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
              const matchedMeta = (webImportHistory || []).find(n => {
                const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                return nt && (nt === cleanBT || cleanBT.includes(nt) || nt.includes(cleanBT)) && n.cover;
              });
              const resolvedCover = activeNovelRecord.cover || currentDocCover || matchedMeta?.cover || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';
              const updatedRec = {
                ...activeNovelRecord,
                cover: resolvedCover,
                isTranslated: true,
                translatedChapters: mappedTranslated,
                targetLang: tgtLang,
                chapters: mappedTranslated,
                rawChapters: (activeNovelRecord.rawChapters && activeNovelRecord.rawChapters.length >= srcChaps.length) ? activeNovelRecord.rawChapters : srcChaps,
                originalChapters: srcChaps,
                chapterCount: mappedTranslated.length
              };
              saveNovelToHistory(updatedRec).catch(e => console.warn('History save error:', e));
              setActiveNovelRecord(updatedRec);
              if (resolvedCover) {
                setCurrentDocCover(resolvedCover);
                try { localStorage.setItem('gemini_current_doc_cover', resolvedCover); } catch (_) {}
              }
              setNovelUpdateBadges(prev => {
                const next = { ...prev };
                delete next[activeNovelRecord.id];
                return next;
              });
            } else {
              const bTitle = (fileName && fileName.trim()) ? fileName.replace(/\.[^/.]+$/, '') : ((chapters && chapters[0]?.title) || 'Translated Novel');
              const cleanBT = bTitle.replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
              const matchedMeta = (webImportHistory || []).find(n => {
                const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                return nt && (nt === cleanBT || cleanBT.includes(nt) || nt.includes(cleanBT)) && n.cover;
              });
              const recCover = currentDocCover || (activeNovelRecord && activeNovelRecord.cover) || activeCrawlSession?.cover || webImportData?.cover || matchedMeta?.cover || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';
              const newRec = {
                id: (activeNovelRecord && activeNovelRecord.id) || ('novel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
                title: bTitle.includes('(Translated)') ? bTitle : `${bTitle} (Translated)`,
                author: (activeNovelRecord && activeNovelRecord.author) || 'Gemini Translator',
                cover: recCover,
                isTranslated: true,
                chapters: mappedTranslated,
                translatedChapters: mappedTranslated,
                targetLang: tgtLang,
                originalChapters: srcChaps,
                originalText: inputText || ''
              };
              saveNovelToHistory(newRec).catch(e => console.warn('History save error:', e));
              setActiveNovelRecord(newRec);
              if (recCover) {
                setCurrentDocCover(recCover);
                try { localStorage.setItem('gemini_current_doc_cover', recCover); } catch (_) {}
              }
            }
          }
          localStorage.removeItem(jobId); activeSessionRef.current = null; setActiveSession(null); setSavedTranslationSession(null); setIsTranslationPaused(false);
          if (window.GeminiNovelDB) { window.GeminiNovelDB.deleteTranslationSession(jobId); }
          toast(`Ebook translation complete in ${durationStr}! (${stats.totalTokens.toLocaleString()} tokens · ${finalCost})`);
          try {
            window.NativeBridge?.releaseWakeLock?.();
            window.NativeBridge?.clearProgressNotification?.(true, 'Book Translation Complete! 🎉', `${chapters.length} chapters translated in ${durationStr}. Tap to read!`);
            window.NativeBridge?.showCompletionNotification?.('Book Translation Complete! 🎉', `${chapters.length} chapters translated in ${durationStr}. Tap to read!`);
            window.NativeBridge?.haptic?.('success');
          } catch(e) {}
          if (webdavAutoSync && webdavUrl.trim()) {
            backupToWebDav().catch(e => console.warn('Auto WebDAV sync error:', e));
          }
          if (gdriveAutoSync && window.GoogleDriveSync?.isConnected()) {
            backupToGoogleDrive().catch(e => console.warn('Auto Google Drive sync error:', e));
          }
        } catch (e) {
          if (e.name !== 'AbortError') { setError(e.message); toast(e.message, 'error'); }
          else {
            setIsTranslationPaused(true);
            const session = activeSessionRef.current || activeSession;
            if (session) {
              setSavedTranslationSession(session);
            } else if (window.GeminiNovelDB) {
              window.GeminiNovelDB.getActiveTranslationSession().then(s => {
                if (s) setSavedTranslationSession(s);
              });
            }
            toast('Translation paused. Progress safely saved to database.', 'info');
          }
          const finalChapters = (activeSessionRef.current || activeSession)?.newChapters || (newChapters.length > 0 ? newChapters : []);
          setTranslatedChapters(finalChapters);
        }
        finally { 
          setIsTranslating(false);
          if (!isPausingRef.current) {
            setProgress(0);
            setProgressLabel('');
          }
          abortRef.current = null;
          isPausingRef.current = false;
          window.NativeBridge?.releaseWakeLock();
        }
      };

      const handleStartTranslation = async (resume = false) => {
        if (chapters && chapters.length > 0) {
          await handleTranslateEbook(chapters, resume, currentIsEpub, currentOriginalZip);
        } else {
          await handleTranslateText(resume);
        }
      };

      const cancelTranslation = () => {
        if (abortRef.current) {
          try { abortRef.current.abort(); } catch (err) {}
        }
        window.NativeBridge?.clearProgressNotification(false);
        window.NativeBridge?.releaseWakeLock();
        setIsTranslating(false);
        setProgressLabel('');
      };

      // --- File Handling ---
      const readFileAsText = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = e => rej(e.target.error); r.readAsText(f) });

      const readPdf = async f => {
        if (!window.pdfjsLib) throw new Error('PDF.js not loaded.');
        const buf = await f.arrayBuffer(); const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise; let txt = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i); const tc = await page.getTextContent(); if (!tc.items?.length) continue;
          const items = tc.items.sort((a, b) => a.transform[5] < b.transform[5] ? 1 : a.transform[5] > b.transform[5] ? -1 : a.transform[4] - b.transform[4]);
          let lastY = items[0].transform[5], line = '';
          for (const it of items) { const y = it.transform[5]; if (Math.abs(y - lastY) > it.height * 0.4) { txt += line + '\n'; if (Math.abs(y - lastY) > it.height * 1.2) txt += '\n'; line = '' } line += it.str + (it.str.endsWith(' ') ? '' : ' '); lastY = y }
          txt += line + '\n\n';
        } return txt;
      };

      const readEpub = async f => {
        if (!window.JSZip) throw new Error('JSZip not loaded.');
        const zip = await window.JSZip.loadAsync(f); const chapters = [];
        const seenChapterKeys = new Set();
        const chapterKey = text => String(text || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
        const cf = zip.file('META-INF/container.xml'); if (!cf) throw new Error('Invalid EPUB');
        const cc = await cf.async('text'); const cd = new DOMParser().parseFromString(cc, 'text/xml');
        const rp = cd.querySelector('rootfile')?.getAttribute('full-path'); if (!rp) throw new Error('No rootfile');
        const od = rp.substring(0, rp.lastIndexOf('/') + 1);
        const of2 = zip.file(rp); if (!of2) throw new Error('OPF not found');
        const oc = await of2.async('text'); const opf = new DOMParser().parseFromString(oc, 'text/xml');
        const bookTitle = (opf.querySelector('title, dc\\:title')?.textContent || '').trim();
        const bookAuthor = (opf.querySelector('creator, dc\\:creator')?.textContent || '').trim();
        const bookIdentifier = (opf.querySelector('identifier, dc\\:identifier')?.textContent || '').trim();
        const bookSource = (opf.querySelector('source, dc\\:source')?.textContent || opf.querySelector('meta[name="source"]')?.getAttribute('content') || '').trim();
        const ncxI = opf.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');
        const ncxH = ncxI ? od + ncxI.getAttribute('href') : null;
        const navI = Array.from(opf.querySelectorAll('manifest item')).find(i => (i.getAttribute('properties') || '').split(/\s+/).includes('nav'));
        const navH = navI ? od + navI.getAttribute('href') : null;
        const titles = new Map();
        if (ncxH) { const nf = zip.file(ncxH); if (nf) { const nc = await nf.async('text'); const nd = new DOMParser().parseFromString(nc, 'text/xml'); nd.querySelectorAll('navPoint').forEach(np => { const l = np.querySelector('navLabel text')?.textContent; const s = np.querySelector('content')?.getAttribute('src'); if (l && s) titles.set(s.split('#')[0], l.trim()) }) } }

        // Only extract raw text for the history preview. We keep `doc` and `zipPath` for True EPUB translation.
        const extractText = n => {
          let t = '';
          const blocks = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'li', 'blockquote', 'tr', 'section', 'article', 'pre'];
          if (n.nodeType === 3) {
            t += (n.textContent || '');
          } else if (n.nodeType === 1) {
            const tag = n.tagName.toLowerCase();
            if (tag === 'br') return '\n';
            for (const c of n.childNodes) {
              const childTxt = extractText(c);
              if (childTxt) {
                if (t && !t.endsWith(' ') && !t.endsWith('\n') && !childTxt.startsWith(' ') && !childTxt.startsWith('\n') && !/[，。！？、,.!?\s]/.test(t.slice(-1))) {
                  t += ' ';
                }
                t += childTxt;
              }
            }
            if (blocks.includes(tag)) {
              t = t.trimEnd() + '\n\n';
            }
          }
          // Clean missing spaces after english punctuation
          return t.replace(/([.!?])([A-Z])/g, '$1 $2');
        };

        for (const ir of opf.querySelectorAll('spine itemref')) {
          const id = ir.getAttribute('idref'); const mi = opf.querySelector(`manifest item[id="${id}"]`); const href = mi?.getAttribute('href'); if (!href) continue;
          const hrefPath = href.split('#')[0];
          const cp = od + hrefPath;
          const properties = (mi.getAttribute('properties') || '').toLowerCase().split(/\s+/);
          if (properties.includes('nav') || cp === navH || cp === ncxH || /(?:^|\/)(?:nav|toc|table[-_ ]?of[-_ ]?contents)(?:[-_.]|\/|$)/i.test(hrefPath)) continue;
          const mt = (mi.getAttribute('media-type') || '').toLowerCase();
          if (mt && (mt === 'application/xhtml+xml' || mt === 'text/html')) {
            const file = zip.file(cp);
            if (file) {
              try {
                const html = await file.async('text');
                const doc = new DOMParser().parseFromString(html, 'text/html');
                let txt = extractText(doc.body);
                let title = titles.get(href.split('#')[0]) || titles.get(href) || '';
                if (!title) {
                  const headingEl = doc.querySelector('h1,h2,h3,h4, [class*="title"], [class*="heading"], [id*="title"], [class*="chap"]');
                  if (headingEl && headingEl.textContent.trim()) {
                    title = headingEl.textContent.trim();
                  }
                }
                if (!title) {
                  const firstLine = (txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || '';
                  if (firstLine && (/^(?:第[0-9零一二三四五六七八九十百千万]+[章节回节卷集部]|Chapter\s+\d+|Section\s+\d+|Volume\s+\d+|[【\[(]?(?:作品相关|内容简介|版权信息|制作信息|引言|序章|前言|楔子)[\]】)]?)/i.test(firstLine) || firstLine.length <= 40)) {
                    title = firstLine;
                  }
                }
                if (!title) title = `Chapter ${chapters.length + 1}`;

                // AO3 / EPUB Summary & Foreword Disambiguation:
                // If chapter body is primarily a summary/synopsis/warning/metadata block, label it "Summary"
                const isSummaryBlock = doc.querySelector('.meta, .tags, [class*="summary"], [class*="preface"], dl.tags') ||
                  /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|Author'?s?\s*Note|内容简介|简介|前言|文案)[:：\s]/i.test(txt || '');
                if (isSummaryBlock && (title.toLowerCase() === bookTitle.toLowerCase() || !title || /^chapter\s+\d+$/i.test(title))) {
                  title = 'Summary';
                }

                if (!txt || !txt.trim()) {
                  const hasImg = doc.querySelector('img, image, svg');
                  if (hasImg) {
                    txt = '[Illustration]';
                  } else {
                    txt = doc.body?.textContent?.trim() || '[Chapter Content]';
                  }
                }
                chapters.push({ title, text: txt, doc, zipPath: cp });
              } catch (e) { }
            }
          }
        }
        // Deduplicate adjacent identical chapter titles (e.g. AO3 summary page and chapter 1 both titled with book name)
        for (let idx = 0; idx < chapters.length - 1; idx++) {
          const cur = chapters[idx];
          const next = chapters[idx + 1];
          if (cur.title.trim().toLowerCase() === next.title.trim().toLowerCase()) {
            const curIsSummary = /(?:^|\n)\s*(?:by\s+[^\n]+\r?\n+)?\s*(?:Summary|Synopsis|Warning|Notes|简介|内容简介|前言)[:：\s]/i.test(cur.text || '');
            if (curIsSummary) {
              cur.title = 'Summary';
            }
          }
        }
        if (!chapters.length) throw new Error('No readable text in EPUB.');

        let extractedCover = '';
        try {
          let coverHref = '';
          let coverMediaType = '';

          // 1. EPUB 3 manifest item with properties="cover-image"
          const coverItem = Array.from(opf.querySelectorAll('manifest item')).find(i => {
            const props = (i.getAttribute('properties') || '').split(/\s+/);
            return props.includes('cover-image');
          });
          if (coverItem) {
            coverHref = coverItem.getAttribute('href');
            coverMediaType = coverItem.getAttribute('media-type');
          }

          // 2. EPUB 2 <meta name="cover" content="cover_item_id"/>
          if (!coverHref) {
            const metaCover = opf.querySelector('metadata meta[name="cover"]');
            if (metaCover) {
              const coverId = metaCover.getAttribute('content');
              if (coverId) {
                const item = opf.querySelector(`manifest item[id="${coverId}"]`);
                if (item) {
                  coverHref = item.getAttribute('href');
                  coverMediaType = item.getAttribute('media-type');
                }
              }
            }
          }

          // 3. EPUB 2/3 <guide><reference type="cover" href="..."/></guide>
          if (!coverHref) {
            const guideCover = opf.querySelector('guide reference[type="cover"]');
            if (guideCover) {
              const href = guideCover.getAttribute('href');
              if (href) {
                if (/\.(jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(href)) {
                  coverHref = href;
                } else {
                  const coverHtmlFile = zip.file(od + href.split('#')[0]);
                  if (coverHtmlFile) {
                    const html = await coverHtmlFile.async('text');
                    const imgDoc = new DOMParser().parseFromString(html, 'text/html');
                    const imgEl = imgDoc.querySelector('image[*|href], img[src]');
                    const foundSrc = imgEl ? (imgEl.getAttribute('href') || imgEl.getAttribute('xlink:href') || imgEl.getAttribute('src')) : '';
                    if (foundSrc) {
                      const pageDir = (od + href.split('#')[0]).substring(0, (od + href.split('#')[0]).lastIndexOf('/') + 1);
                      const resolvedCoverPath = (pageDir + foundSrc).replace(/\/\.\//g, '/').replace(/[^/]+\/\.\.\//g, '');
                      const resolvedFile = zip.file(resolvedCoverPath);
                      if (resolvedFile) {
                        const b64 = await resolvedFile.async('base64');
                        const ext = resolvedCoverPath.split('.').pop().toLowerCase();
                        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                        extractedCover = `data:${mime};base64,${b64}`;
                      }
                    }
                  }
                }
              }
            }
          }

          // 4. Heuristic manifest search for cover image
          if (!extractedCover && !coverHref) {
            const heuristicItem = Array.from(opf.querySelectorAll('manifest item')).find(i => {
              const id = (i.getAttribute('id') || '').toLowerCase();
              const href = (i.getAttribute('href') || '').toLowerCase();
              const mt = (i.getAttribute('media-type') || '').toLowerCase();
              return mt.startsWith('image/') && (id.includes('cover') || href.includes('cover'));
            });
            if (heuristicItem) {
              coverHref = heuristicItem.getAttribute('href');
              coverMediaType = heuristicItem.getAttribute('media-type');
            }
          }

          if (!extractedCover && coverHref) {
            const cleanHref = coverHref.split('#')[0];
            const fullCoverPath = od + cleanHref;
            const coverZipFile = zip.file(fullCoverPath) || zip.file(cleanHref);
            if (coverZipFile) {
              const b64 = await coverZipFile.async('base64');
              const ext = fullCoverPath.split('.').pop().toLowerCase();
              const mime = coverMediaType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg');
              extractedCover = `data:${mime};base64,${b64}`;
            }
          }
        } catch (coverErr) {
          console.warn('Cover extraction warning:', coverErr);
        }

        window.telemetryLog?.('EPUB_PARSE', `Extracted ${chapters.length} chapters from EPUB: "${bookTitle || f.name}"`, {
          title: bookTitle || f.name,
          chapterCount: chapters.length,
          hasCover: Boolean(extractedCover),
          sizeBytes: f.size
        });
        return { chapters, isEpub: true, originalZip: zip, cover: extractedCover, title: bookTitle, author: bookAuthor, uuid: bookIdentifier, sourceUrl: bookSource };
      };

      const readDocx = async f => {
        if (!window.JSZip) throw new Error('JSZip is required to read .docx files.');
        const zip = await window.JSZip.loadAsync(f);
        const docFile = zip.file('word/document.xml');
        if (!docFile) throw new Error('Invalid Word (.docx) document: word/document.xml not found.');
        const xmlText = await docFile.async('text');

        let lines = [];
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const paragraphs = xmlDoc.getElementsByTagName('w:p');
          if (paragraphs && paragraphs.length > 0) {
            for (let i = 0; i < paragraphs.length; i++) {
              const p = paragraphs[i];
              const isHeading = Boolean(p.querySelector && p.querySelector('pStyle[val*="Heading"], pStyle[val*="Title"], pStyle[val*="heading"], pStyle[val*="title"], w\\:pStyle[w\\:val*="Heading"], w\\:pStyle[w\\:val*="Title"]'));
              const textNodes = p.querySelectorAll ? p.querySelectorAll('w\\:t, t, w\\:br, br, w\\:tab, tab') : p.getElementsByTagName('w:t');
              let pText = '';
              if (textNodes && textNodes.length > 0) {
                for (let j = 0; j < textNodes.length; j++) {
                  const node = textNodes[j];
                  const tag = (node.tagName || '').toLowerCase();
                  if (tag.endsWith('br')) pText += '\n';
                  else if (tag.endsWith('tab')) pText += ' ';
                  else pText += node.textContent || '';
                }
              } else {
                const ts = p.getElementsByTagName('w:t');
                for (let j = 0; j < ts.length; j++) pText += ts[j].textContent || '';
              }
              const trimmed = pText.trim();
              if (trimmed) {
                if (isHeading && !trimmed.startsWith('#')) {
                  lines.push(`# ${trimmed}`);
                } else {
                  lines.push(trimmed);
                }
              }
            }
          }
        } catch (domErr) {
          console.warn('DOMParser failed on docx, using regex fallback:', domErr);
        }

        if (lines.length === 0) {
          const pMatches = xmlText.match(/<w:p[\s>].*?<\/w:p>/g) || [];
          lines = pMatches.map(p => {
            const tMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
            return tMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
          }).filter(l => l.trim());
        }

        const fullText = lines.join('\n\n');
        if (!fullText.trim()) throw new Error('Word document contains no readable text.');
        return fullText;
      };

      const processFile = async f => {
        setUploadingFile(true); setError(''); setInputText(''); setAssembledText(''); setTranslatedChapters([]); setChapters([]);
        const hashId = generateJobId(f.name + f.size, true);
        setCurrentFileHash(hashId);
        try {
          const fname = (f.name || '').toLowerCase();
          let data;
          if (fname.endsWith('.docx') || fname.endsWith('.doc')) {
            if (fname.endsWith('.doc') && !fname.endsWith('.docx')) {
              throw new Error('Legacy binary .doc files are not supported. Please save as modern .docx or .txt before importing.');
            }
            const docxText = await readDocx(f);
            const fallbackTitle = f.name.replace(/\.docx$/i, '');
            const parsedChs = typeof parseAssembledTextToChapters === 'function' ? parseAssembledTextToChapters(docxText, fallbackTitle) : [];
            const chs = (parsedChs.length > 0)
              ? parsedChs.map(c => ({ title: c.title, text: c.content || c.text || '', content: c.content || c.text || '' }))
              : [{ title: fallbackTitle, text: docxText, content: docxText }];
            data = { chapters: chs, title: fallbackTitle };
            setInputText(docxText);
          } else if (fname.endsWith('.json') || f.type === 'application/json') {
            setUploadingFile(false);
            return importFullBackup({ target: { files: [f] } });
          } else if (f.type === 'text/plain' || fname.endsWith('.txt')) {
            const rawText = await readFileAsText(f);
            data = { chapters: [{ title: f.name.replace(/\.txt$/i, ''), text: rawText, content: rawText }] };
            setInputText(rawText);
          } else if (f.type === 'application/pdf' || fname.endsWith('.pdf')) {
            const pdfText = await readPdf(f);
            data = { chapters: [{ title: f.name.replace(/\.pdf$/i, ''), text: pdfText, content: pdfText }] };
          } else if (f.type === 'application/epub+zip' || fname.endsWith('.epub') || fname.endsWith('.zip')) {
            data = await readEpub(f);
          } else {
            // Fallback: try reading as text
            try {
              const rawText = await readFileAsText(f);
              if (rawText && rawText.trim()) {
                data = { chapters: [{ title: f.name || 'Imported Document', text: rawText, content: rawText }] };
                setInputText(rawText);
              } else {
                throw new Error('Unsupported file type. Please use .txt, .pdf, .epub, .docx, or .json backup.');
              }
            } catch (err) {
              throw new Error('Unsupported file type. Please use .txt, .pdf, .epub, .docx, or .json backup.');
            }
          }

          const isEpub = data.isEpub || false;
          const originalZip = data.originalZip || null;
          const extractedCover = data.cover || '';
          setCurrentIsEpub(isEpub);
          setCurrentOriginalZip(originalZip);
          if (extractedCover) {
            setCurrentDocCover(extractedCover);
          } else {
            setCurrentDocCover('');
          }
          setFileName(f.name);
          const docTitle = data.title || f.name.replace(/\.[^.]+$/, '');
          setCurrentDocTitle(docTitle);
          if (originalZip) window.currentTranslatedZip = originalZip;

          const cleaned = data.chapters.map(c => ({
            ...c,
            text: isEpub ? (c.text || c.content || '') : cleanText(c.text || c.content || ''),
            content: isEpub ? (c.content || c.text || '') : cleanText(c.content || c.text || '')
          }));
          setChapters(cleaned);
          window.telemetryLog?.('FILE_IMPORT', `Ingested file "${f.name}" (${(f.size / 1024).toFixed(1)} KB, isEpub=${isEpub}) -> ${cleaned.length} chapters loaded.`, {
            fileName: f.name,
            fileSize: f.size,
            chapterCount: cleaned.length,
            isEpub
          });

          const saved = localStorage.getItem(hashId);
          if (saved) {
            const willResume = confirm(`Found an incomplete translation for "${f.name}". Do you want to resume? (Cancel to start fresh)`);
            if (willResume) {
              setActiveSession(JSON.parse(saved));
              toast(`Resuming translation for ${f.name}...`, 'info');
              await handleTranslateEbook(cleaned, true, isEpub, originalZip);
              return;
            } else {
              localStorage.removeItem(hashId);
            }
          }

          toast(`Loaded "${f.name}" (${cleaned.length} chapters)! Review settings and tap "Translate".`, 'success');
        } catch (e) { setError(e.message); toast(e.message, 'error') }
        finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = '' }
      };

      // --- Drag & Drop ---
      const onDragOver = e => { e.preventDefault(); setIsDragOver(true) };
      const onDragLeave = () => setIsDragOver(false);
      const onDrop = e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) };

      // Restored handlers referenced by the render tree (were undefined)
      const handlePasteFromClipboard = async () => {
        try {
          const t = await navigator.clipboard.readText();
          if (t && t.trim()) {
            setInputText(t);
            setChapters([]);
            localStorage.setItem('inputText', t);
            toast('Pasted from clipboard.');
          } else {
            toast('Clipboard is empty.', 'info');
          }
        } catch (e) { toast('Clipboard access denied by browser.', 'error'); }
      };

      const handleAutoDetectSplit = () => {
        const text = (inputText || '').trim();
        if (!text) {
          toast('Please enter or paste text with chapter headings first.', 'warning');
          return;
        }
        const lines = text.split(/\r?\n/);
        const heading = /^(?:第[0-9零一二三四五六七八九十百千万]+[章回卷节篇]|(?:Chapter|Ch\.|Episode|Ep\.|Volume|Vol\.|Book|Part|Act|Section|Prologue|Epilogue|Side Story|Interlude|Arc)\b|CHAPTER\s*\d+)/i;
        const parts = [];
        let cur = null;
        for (const line of lines) {
          const trimmed = line.trim();
          if (heading.test(trimmed)) {
            if (cur) parts.push(cur);
            cur = { title: trimmed, content: '' };
          } else if (cur) {
            cur.content += line + '\n';
          } else {
            cur = { title: 'Chapter 1', content: line + '\n' };
          }
        }
        if (cur) parts.push(cur);
        if (parts.length > 1) {
          setChapters(parts.map(p => ({ title: p.title, content: p.content.trim(), text: p.content.trim() })));
          toast(`Split into ${parts.length} chapters.`, 'success');
        } else {
          toast('No chapter headings detected — using whole text as one chapter.', 'info');
          setChapters([{ title: 'Chapter 1', content: text, text: text }]);
        }
      };

      const handleSwapLanguages = () => {
        if (srcLang === 'Auto-detect') { toast('Auto-detect cannot be swapped — pick a source language first.', 'info'); return; }
        const s = srcLang; setSrcLang(tgtLang); setTgtLang(s);
      };

      // --- Download Handlers ---
      const sanitizeTextForPdf = (str) => {
        if (!str) return '';
        let s = str
          .replace(/[ōŌ]/g, m => m === 'ō' ? 'o' : 'O')
          .replace(/[ūŪ]/g, m => m === 'ū' ? 'u' : 'U')
          .replace(/[āĀ]/g, m => m === 'ā' ? 'a' : 'A')
          .replace(/[īĪ]/g, m => m === 'ī' ? 'i' : 'I')
          .replace(/[ēĒ]/g, m => m === 'ē' ? 'e' : 'E')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        s = s
          .replace(/[\u3000\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, ' ')
          .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
          .replace(/[\u2013\u2014\u2015\u2E3A\u2E3B]/g, ' - ')
          .replace(/\u2026/g, '...')
          .replace(/[«»「」『』]/g, '"')
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
          .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
          .replace(/[ \t]+/g, ' ')
          .trim();
        return s;
      };

      const isGenericTitle = t => !t || t.trim() === '' || /^translated\s*(document|file)?$/i.test(t.trim());

      const getExportChapters = () => {
        const curText = assembledText && assembledText.trim();
        const knownTitles = (translatedChapters || []).map(c => c?.title || c?.originalTitle).filter(Boolean);

        // Priority 1: Multi-chapter translation
        if (translatedChapters && translatedChapters.length > 1) {
          if (curText) {
            const fallbackTitle = (translatedChapters && translatedChapters[0]?.title) || currentDocTitle || fileName || 'Chapter 1';
            const parsed = typeof parseAssembledTextToChapters === 'function' ? parseAssembledTextToChapters(curText, fallbackTitle, knownTitles) : [];
            if (parsed.length === translatedChapters.length) {
              return parsed.map((p, i) => ({
                ...translatedChapters[i],
                title: p.title || translatedChapters[i].title,
                content: p.content || p.text || '',
                text: p.content || p.text || ''
              }));
            } else if (parsed.length > 1) {
              return parsed.map((p, i) => ({
                ...(translatedChapters[i] || {}),
                title: p.title || `Chapter ${i + 1}`,
                content: p.content || p.text || '',
                text: p.content || p.text || ''
              }));
            } else if (parsed.length === 1 && translatedChapters.length > 1) {
              const partitioned = partitionTextByChapters(curText, translatedChapters);
              if (partitioned && partitioned.length === translatedChapters.length) {
                return partitioned;
              }
            }
          }
          const valid = translatedChapters.filter(ch => ch && (ch.content || ch.text) && String(ch.content || ch.text).trim() && !String(ch.content || ch.text).startsWith('[Error:'));
          if (valid.length > 0) return valid;
        }

        // Priority 2: Single-chapter translation or edited text
        if (curText) {
          const fallbackTitle = (translatedChapters && translatedChapters[0]?.title) || currentDocTitle || fileName || 'Translated Document';
          const parsed = typeof parseAssembledTextToChapters === 'function' ? parseAssembledTextToChapters(curText, fallbackTitle, knownTitles) : [];
          if (parsed.length > 0) {
            return parsed;
          }
          return [{ title: fallbackTitle, content: curText, text: curText }];
        }

        // Priority 3: Fallback to translatedChapters
        if (translatedChapters && translatedChapters.length > 0) {
          const valid = translatedChapters.filter(ch => ch && (ch.content || ch.text) && String(ch.content || ch.text).trim() && !String(ch.content || ch.text).startsWith('[Error:'));
          if (valid.length > 0) return valid;
        }

        // Priority 4: Source / raw chapters fallback
        if (chapters && chapters.length > 0) {
          return chapters.filter(Boolean).map((c, i) => ({ title: c?.title || `Chapter ${i + 1}`, content: c?.text || c?.content || '', text: c?.text || c?.content || '' }));
        }
        return [];
      };

      const handleDownloadPDF = async () => {
        const chaptersToExport = getExportChapters();
        if (!chaptersToExport.length) {
          setError('No translated content available yet to download.');
          toast('No translated content available yet to download.', 'warning');
          return;
        }
        setDownloadingPdf(true); setError('');
        try {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
          doc.setFont('Helvetica', 'normal');
          const m = 18;
          const mw = doc.internal.pageSize.getWidth() - 2 * m;
          const pageHeight = doc.internal.pageSize.getHeight();
          const lh = 6.2;
          let y = m + 5;

          chaptersToExport.forEach((ch, i) => {
            if (i > 0) { doc.addPage(); y = m + 5; }
            const hasRealTitle = ch.title && ch.title.trim() && !isGenericTitle(ch.title);
            if (hasRealTitle) {
              const cleanTitle = sanitizeTextForPdf(ch.title);
              doc.setFontSize(16);
              doc.setFont('Helvetica', 'bold');
              doc.text(cleanTitle, m, y);
              y += lh * 2.2;
              doc.setFont('Helvetica', 'normal');
            }
            doc.setFontSize(10.5);
            const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
            const cleanContent = (typeof stripFn === 'function') ? stripFn(ch.content || '', ch.title, ch.originalTitle) : (ch.content || '');
            const rawLines = cleanContent.split(/\r?\n/);
            for (const rawLine of rawLines) {
              const p = sanitizeTextForPdf(rawLine);
              if (!p) continue;

              const isSceneDivider = /^(\*|\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(p);
              const splitLines = doc.splitTextToSize(p, mw);

              if (y + (splitLines.length * lh) > pageHeight - m) {
                doc.addPage();
                y = m + 5;
              }

              splitLines.forEach(l => {
                if (isSceneDivider) {
                  doc.text(l, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
                } else {
                  doc.text(l, m, y);
                }
                y += lh;
              });
              y += isSceneDivider ? lh * 0.8 : lh * 0.45;
            }
          });
          const pdfBlob = doc.output('blob');
          const docTitle = chaptersToExport.length === 1 && !isGenericTitle(chaptersToExport[0].title) ? chaptersToExport[0].title.trim() : `Translated Novel (${tgtLang})`;
          const cleanDocName = docTitle && !isGenericTitle(docTitle) ? sanitizeFilename(docTitle).replace(/\s+/g, ' ').trim() : `Translated Novel (${tgtLang})`;
          const pdfFileName = `${cleanDocName}.pdf`;
          await saveUniversalBlob(pdfBlob, pdfFileName, 'application/pdf');
        } catch (e) { setError(`PDF error: ${e.message}`) } finally { setDownloadingPdf(false) }
      };

      // (escapeXml is global)

      const handleDownloadEPUB = async () => {
        const chaptersToExport = getExportChapters();
        if (!chaptersToExport.length) {
          setError('No translated content available yet to download.');
          toast('No translated content available yet to download.', 'warning');
          return;
        }
        setDownloadingEpub(true);
        setError('');
        try {
          const rawBaseTitle = (fileName && fileName.trim()) || (activeNovelRecord && activeNovelRecord.title) || currentDocTitle || (chaptersToExport.length === 1 && !isGenericTitle(chaptersToExport[0].title) ? chaptersToExport[0].title.trim() : null);
          const docTitle = rawBaseTitle
            ? (rawBaseTitle.includes('(Translated)') ? rawBaseTitle : `${rawBaseTitle} (Translated)`)
            : `Translated Novel (${tgtLang})`;
          const cleanDocTitle = (typeof cleanBookTitle === 'function' ? cleanBookTitle(docTitle, chaptersToExport) : (docTitle || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const author = (activeNovelRecord && activeNovelRecord.author) || 'Gemini Translator';
          const cleanAuthor = (typeof cleanBookAuthor === 'function' ? cleanBookAuthor(author) : (author || 'Gemini Translator')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
          const lang = tgtLang.split(/[-_ ]/)[0].toLowerCase() || 'en';

          window.telemetryLog?.('FILE_EXPORT', `Starting EPUB export: "${cleanDocTitle}" (${chaptersToExport.length} chapters, preserveOriginal=${!!(currentIsEpub && currentOriginalZip)})`, {
            title: cleanDocTitle,
            author: cleanAuthor,
            chapters: chaptersToExport.length
          });

          // Preserve the ORIGINAL EPUB structure (OPF/TOC/format) when translating from an EPUB file
          if (currentIsEpub && currentOriginalZip && typeof currentOriginalZip.generateAsync === 'function') {
            setEpubPackagingModal({ title: cleanDocTitle, status: ' Packaging original EPUB structure…', pct: 40 });
            await updateOriginalEpubNavigation(currentOriginalZip, chaptersToExport);
            const zipBlob = await currentOriginalZip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
            setEpubPackagingModal(null);
            const cleanDocName = sanitizeFilename(cleanDocTitle).replace(/\s+/g, ' ').trim();
            const outFileName = `${cleanDocName}.epub`;
            const res = await saveUniversalBlob(zipBlob, outFileName, 'application/epub+zip');
            toast(' EPUB downloaded with the original structure!', 'success');
            window.telemetryLog?.('FILE_EXPORT', `EPUB exported (original structure): "${outFileName}" (${(zipBlob.size / 1024).toFixed(1)} KB)`);
            return { blob: zipBlob, fileName: outFileName, path: res?.path };
          }

          const cleanDocBase = String(cleanDocTitle || fileName || '').replace(/\.[^/.]+$/, '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
          const matchedFromHistory = (typeof webImportHistory !== 'undefined' && Array.isArray(webImportHistory))
            ? webImportHistory.find(n => {
                const nt = String(n?.title || '').replace(/\s*\((?:Translated|Translation)\)/gi, '').trim().toLowerCase();
                return nt && (nt === cleanDocBase || cleanDocBase.includes(nt) || nt.includes(cleanDocBase)) && n.cover;
              })
            : null;
          const resolvedCover = (typeof currentDocCover !== 'undefined' && currentDocCover) ||
                                activeNovelRecord?.cover ||
                                activeCrawlSession?.cover ||
                                webImportData?.cover ||
                                matchedFromHistory?.cover ||
                                (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_current_doc_cover') : '') || '';

          // Always compile a clean, standardized EPUB with translated TOC and proper paragraph spacing
          setEpubPackagingModal({ title: cleanDocTitle, status: ' Assembling translated EPUB archive...', pct: 10 });
          const epubOpts = typeof getEpubOptions === 'function'
            ? getEpubOptions({ title: cleanDocTitle, coverUrl: resolvedCover })
            : { coverUrl: resolvedCover };
          const blob = await generateEpubFromChapters(chaptersToExport, cleanDocTitle, cleanAuthor, lang, (status, pct, elapsed) => {
            setEpubPackagingModal({ title: cleanDocTitle, status, pct, elapsed });
          }, epubOpts);
          setEpubPackagingModal(null);
          toast(' EPUB downloaded successfully!', 'success');
          const cleanDocName = cleanDocTitle && !isGenericTitle(cleanDocTitle) ? sanitizeFilename(cleanDocTitle).replace(/\s+/g, ' ').trim() : `Translated Novel (${tgtLang})`;
          const outFileName = `${cleanDocName}.epub`;
          const res = await saveUniversalBlob(blob, outFileName, 'application/epub+zip');
          window.telemetryLog?.('FILE_EXPORT', `EPUB exported: "${outFileName}" (${(blob.size / 1024).toFixed(1)} KB)`);
          return { blob, fileName: outFileName, path: res?.path };
        } catch (e) {
          setError(`EPUB error: ${e.message}`);
          toast(`EPUB error: ${e.message}`, 'error');
        } finally {
          setDownloadingEpub(false);
        }
      };

      const handleDownloadDOCX = async () => {
        const chaptersToExport = getExportChapters();
        if (!chaptersToExport.length) {
          setError('No content to download.');
          toast('No content to download.', 'warning');
          return;
        }
        setDownloadingDocx(true);
        setError('');
        try {
          const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;
          const sections = chaptersToExport.map((ch, i) => {
            const hasRealTitle = ch.title && ch.title.trim() && !isGenericTitle(ch.title);
            const paragraphElements = [];

            if (hasRealTitle) {
              paragraphElements.push(new Paragraph({
                text: ch.title.trim(),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 280 }
              }));
            }

            const stripFn = (typeof window !== 'undefined' && window.stripLeadingTitleFromContent) ? window.stripLeadingTitleFromContent : null;
            const cleanContent = (typeof stripFn === 'function') ? stripFn(ch.content || '', ch.title, ch.originalTitle) : (ch.content || '');
            const lines = cleanContent.split(/\r?\n/);
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              // Center divider markers (e.g. *, ***, ..., ---)
              const isSceneDivider = /^(\*|\*{3,}|\.{3,}|—{2,}|-{3,})$/.test(trimmed);

              paragraphElements.push(new Paragraph({
                alignment: isSceneDivider ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: trimmed,
                    font: 'Calibri',
                    size: 24 // 12pt
                  })
                ],
                spacing: {
                  line: 360, // 1.5 line height
                  after: isSceneDivider ? 240 : 180 // Webnovel spacing after sentence/dialogue
                }
              }));
            }

            return {
              properties: i > 0 ? { type: (window.docx?.SectionType?.NEXT_PAGE || 'nextPage'), page: { pageBreaks: { before: true } } } : {},
              children: paragraphElements
            };
          });

          const doc = new Document({
            sections,
            styles: {
              default: {
                document: {
                  run: { font: 'Calibri', size: 24 }
                }
              }
            }
          });
          const blob = await Packer.toBlob(doc);
          const docTitle = chaptersToExport.length === 1 && !isGenericTitle(chaptersToExport[0].title) ? chaptersToExport[0].title.trim() : `Translated Novel (${tgtLang})`;
          const cleanDocName = docTitle && !isGenericTitle(docTitle) ? sanitizeFilename(docTitle).replace(/\s+/g, ' ').trim() : `Translated Novel (${tgtLang})`;
          const docxFileName = `${cleanDocName}.docx`;
          await saveUniversalBlob(blob, docxFileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        } catch (e) {
          setError(`DOCX error: ${e.message}`);
          toast(`DOCX error: ${e.message}`, 'error');
        } finally {
          setDownloadingDocx(false);
        }
      };

      // --- Helpers for render ---
      const btn = (props, ...ch) => h('button', props, ...ch);
      const ic = (Icon, size = 18) => {
        const comp = Icon || LucideIcons?.['BookText'] || LucideIcons?.['FileText'] || 'span';
        return h(comp, { size, className: 'shrink-0' });
      };
      const disabled = isTranslating || uploadingFile;
      const activeModel = useCustomModel && customModel ? customModel : geminiModel;

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════
      // ═══════════════════════════════════
      // TWO LIGHTS RENDER (Phase 1)
      // ═══════════════════════════════════
      const [sheetOpen, setSheetOpen] = useState(false);
      const [glossaryEditorOpen, setGlossaryEditorOpen] = useState(false);
      const [logsModalOpen, setLogsModalOpen] = useState(false);
      const [glossaryCardOpen, setGlossaryCardOpen] = useState(() => localStorage.getItem('glossaryCardOpen') !== 'false');
      useEffect(() => { localStorage.setItem('glossaryCardOpen', String(glossaryCardOpen)); }, [glossaryCardOpen]);
      const [bulkKeyModalOpen, setBulkKeyModalOpen] = useState(false);
      const [keyHealth, setKeyHealth] = useState({});
      const [testingKeys, setTestingKeys] = useState(false);
      const [bulkKeyText, setBulkKeyText] = useState('');
      const [showLiveLogs, setShowLiveLogs] = useState(() => localStorage.getItem('showLiveLogs') === 'true');
      useEffect(() => { localStorage.setItem('showLiveLogs', String(showLiveLogs)); }, [showLiveLogs]);
      const logsContainerRef = useRef(null);
      const [liveLogs, setLiveLogs] = useState(() => window.AppLogger ? [...window.AppLogger.logs] : []);
      useEffect(() => {
        if ((!logsModalOpen && !showLiveLogs) || !window.AppLogger) return;
        setLiveLogs([...window.AppLogger.logs]);
        let rafId = null;
        let latestLogs = null;
        const unsub = window.AppLogger.subscribe(logs => {
          latestLogs = logs;
          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (latestLogs) {
                setLiveLogs([...latestLogs]);
                if (logsContainerRef.current) {
                  logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
                }
              }
            });
          }
        });
        return () => {
          if (rafId) cancelAnimationFrame(rafId);
          if (unsub) unsub();
        };
      }, [logsModalOpen, showLiveLogs]);

      // Live Agent Telemetry & Debugging (Method 2 Wireless Wi-Fi)
      const [telemetryEnabled, setTelemetryEnabled] = useState(() => localStorage.getItem('telemetry_enabled') !== 'false');
      const [telemetryVerbose, setTelemetryVerbose] = useState(() => localStorage.getItem('telemetry_verbose') !== 'false');
      const [telemetryServerUrl, setTelemetryServerUrl] = useState(() => localStorage.getItem('telemetry_server_url') || 'http://192.168.1.216:9090');
      const [telemetryTesting, setTelemetryTesting] = useState(false);
      const [telemetryStatus, setTelemetryStatus] = useState('idle');
      const [telemetryStatusMsg, setTelemetryStatusMsg] = useState('');

      const handleTestTelemetryConnection = async () => {
        setTelemetryTesting(true);
        setTelemetryStatusMsg('');
        try {
          const cleanUrl = (telemetryServerUrl || 'http://192.168.1.216:9090').replace(/\/+$/, '');
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 4000);
          const res = await fetch(`${cleanUrl}/status`, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setTelemetryStatus('connected');
          setTelemetryStatusMsg(`✅ Connected! Telemetry Server active at ${cleanUrl} (Host: ${data.host || 'PC'})`);
          window.updateTelemetryConfig?.({ serverUrl: cleanUrl });
          toast('Connected to PC Agent Telemetry!', 'success');
          window.sendTelemetry?.('PING', 'Android device successfully connected to PC Telemetry Server!', { userAgent: navigator.userAgent });
        } catch (err) {
          setTelemetryStatus('error');
          setTelemetryStatusMsg(`❌ Could not connect to ${telemetryServerUrl}: ${err.message}. Ensure PC and phone are on the same Wi-Fi.`);
          toast('Connection failed. Check Wi-Fi & URL.', 'error');
        } finally {
          setTelemetryTesting(false);
        }
      };

      const handleClearTelemetryServer = async () => {
        try {
          const cleanUrl = (telemetryServerUrl || 'http://192.168.1.216:9090').replace(/\/+$/, '');
          await fetch(`${cleanUrl}/clear`, { method: 'POST' });
          window.AppLogger?.clear();
          window.telemetryLog?.('CONFIG', 'Cleared all live telemetry logs on PC & device.');
          toast('Telemetry logs cleared on PC & device.', 'info');
        } catch(e) {
          toast('Could not clear server logs: ' + e.message, 'error');
        }
      };
      const [elapsedSec, setElapsedSec] = useState(0);
      const [libCollapsed, setLibCollapsed] = useState({ books: false, history: false });
      const [libQuery, setLibQuery] = useState('');
      const [libTab, setLibTab] = useState('all');
      const libQ = libQuery.trim().toLowerCase();
      const filteredBooks = useMemo(() => {
        if (!libQ) return webImportHistory || [];
        return (webImportHistory || []).filter(item => {
          const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '';
          return `${item.title || ''} ${item.chapterCount || ''} ${dateStr}`.toLowerCase().includes(libQ);
        });
      }, [webImportHistory, libQ]);

      const filteredHistory = useMemo(() => {
        if (!libQ) return history || [];
        return (history || []).filter(entry => {
          const dateStr = entry.ts ? new Date(entry.ts).toLocaleDateString() : '';
          return `${dateStr} ${entry.srcLang || ''} ${entry.tgtLang || ''} ${entry.outputPreview || ''}`.toLowerCase().includes(libQ);
        });
      }, [history, libQ]);

      const filteredAudiobooks = useMemo(() => {
        if (!libQ) return savedAudiobooks || [];
        return (savedAudiobooks || []).filter(item => {
          return `${item.title || ''} ${item.author || ''}`.toLowerCase().includes(libQ);
        });
      }, [savedAudiobooks, libQ]);

      const totalSavedSpace = useMemo(() => (webImportHistory || []).filter(b => b && b.inSavedSpace).length, [webImportHistory]);
      const totalTrans = useMemo(() => (webImportHistory || []).filter(b => b && (b.isTranslated || (b.title || '').includes('(Translated)'))).length, [webImportHistory]);
      const totalInc = useMemo(() => (webImportHistory || []).filter(b => b && b.isIncomplete).length + (savedTranslationSession ? 1 : 0), [webImportHistory, savedTranslationSession]);

      const savedSpaceCount = useMemo(() => {
        const m = (filteredBooks || []).filter(b => b && b.inSavedSpace).length;
        return libQ ? `${m}/${totalSavedSpace}` : m;
      }, [filteredBooks, totalSavedSpace, libQ]);

      const transCount = useMemo(() => {
        const m = (filteredBooks || []).filter(b => b && (b.isTranslated || (b.title || '').includes('(Translated)'))).length;
        return libQ ? `${m}/${totalTrans}` : m;
      }, [filteredBooks, totalTrans, libQ]);

      const incCount = useMemo(() => {
        const m = (filteredBooks || []).filter(b => b && b.isIncomplete).length + (savedTranslationSession ? 1 : 0);
        return libQ ? `${m}/${totalInc}` : m;
      }, [filteredBooks, totalInc, savedTranslationSession, libQ]);

      const allCountLabel = useMemo(() => {
        const total = (webImportHistory || []).length;
        return libQ ? `${filteredBooks.length}/${total}` : total;
      }, [filteredBooks.length, webImportHistory, libQ]);
      const displayedBooks = useMemo(() => {
        if (libTab === 'saved') return (filteredBooks || []).filter(b => b && b.inSavedSpace);
        if (libTab === 'translated') return (filteredBooks || []).filter(b => b && (b.isTranslated || (b.title || '').includes('(Translated)')));
        if (libTab === 'incomplete') return (filteredBooks || []).filter(b => b && b.isIncomplete);
        return (filteredBooks || []).filter(Boolean);
      }, [filteredBooks, libTab]);
      const translateStartRef = useRef(null);
      useEffect(() => {
        if (!isTranslating) {
          translateStartRef.current = null;
          setElapsedSec(0);
          return;
        }
        if (!translateStartRef.current) {
          translateStartRef.current = Date.now();
        }
        const updateElapsed = () => {
          if (translateStartRef.current) {
            setElapsedSec(Math.max(0, Math.floor((Date.now() - translateStartRef.current) / 1000)));
          }
        };
        updateElapsed();
        const t = setInterval(updateElapsed, 1000);
        const handleVisibilityChange = () => {
          if (!document.hidden) updateElapsed();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
          clearInterval(t);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }, [isTranslating]);

      useEffect(() => { localStorage.setItem('readerTheme', readerTheme); }, [readerTheme]);
      useEffect(() => { localStorage.setItem('readerFont', readerFont); }, [readerFont]);
      useEffect(() => { localStorage.setItem('readerFontSize', String(readerFontSize)); }, [readerFontSize]);

      useEffect(() => {
        const openGloss = () => setGlossaryEditorOpen(true);
        window.addEventListener('open-glossary-editor', openGloss);
        return () => window.removeEventListener('open-glossary-editor', openGloss);
      }, []);

      useEffect(() => {
        const esc = (e) => {
          if (e.key === 'Escape') {
            setSheetOpen(false);
            setGlossaryEditorOpen(false);
          }
        };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
      }, []);

      useEffect(() => {
        try {
          window.NativeBridge?.requestNotificationPermission?.();
        } catch (e) {}
      }, []);

      const importGlossaryFile = (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        readFileAsText(f)
          .then(t => { setTerminology(t); localStorage.setItem('terminology', t); toast('Glossary imported.'); })
          .catch(err => toast('Import failed: ' + err.message, 'error'));
        e.target.value = '';
      };

      const syncCrawlSessionChapters = (updatedChapters) => {
        setActiveCrawlSession(prev => {
          if (!prev) return null;
          const nextSession = { ...prev, chapters: updatedChapters };
          try {
            localStorage.setItem('gemini_active_crawl_session', JSON.stringify(nextSession));
          } catch (_) {}
          return nextSession;
        });
      };

      const removeImportChapter = (idx) => {
        const targetChapter = (webImportData?.chapters && webImportData.chapters[idx]) ||
                              (activeCrawlSession?.chapters && activeCrawlSession.chapters[idx]) || null;
        const chTitle = targetChapter?.title ? `"${targetChapter.title}"` : `Chapter ${idx + 1}`;
        confirmAction(`Remove ${chTitle} from the chapter list?`, () => {
          setWebImportData(prev => {
            const base = prev || activeCrawlSession;
            if (!base || !base.chapters) return prev;
            const chapters = base.chapters.filter((_, i) => i !== idx);
            syncCrawlSessionChapters(chapters);
            return { ...base, chapters };
          });
        });
      };

      const moveImportChapter = (idx, dir) => {
        setWebImportData(prev => {
          const base = prev || activeCrawlSession;
          if (!base || !base.chapters) return prev;
          const chapters = [...base.chapters];
          const j = idx + dir;
          if (j < 0 || j >= chapters.length) return prev;
          [chapters[idx], chapters[j]] = [chapters[j], chapters[idx]];
          syncCrawlSessionChapters(chapters);
          return { ...base, chapters };
        });
      };

      const moveImportChapterToEdge = (idx, edge) => {
        setWebImportData(prev => {
          const base = prev || activeCrawlSession;
          if (!base || !base.chapters || base.chapters.length <= 1) return prev;
          const chapters = [...base.chapters];
          const [target] = chapters.splice(idx, 1);
          if (edge === 'top') {
            chapters.unshift(target);
          } else {
            chapters.push(target);
          }
          syncCrawlSessionChapters(chapters);
          return { ...base, chapters };
        });
        toast(edge === 'top' ? 'Moved chapter to start.' : 'Moved chapter to end.', 'info');
      };

      const autoSortImportChapters = () => {
        setWebImportData(prev => {
          const base = prev || activeCrawlSession;
          if (!base || !base.chapters || base.chapters.length <= 1) return prev;

          const parseChapterWeight = (title, idx) => {
            const raw = (title || '').trim().toLowerCase();

            // 1. Prologue / Preface / Intro / 序
            if (/^(prologue|preface|intro|introduction|foreword|序章|序)\b/i.test(raw)) {
              return -999999 + idx * 0.001;
            }

            // 2. Epilogue / Afterword / 终章 / 尾声 (only if not an explicitly numbered chapter like "Chapter 861: Epilogue")
            if (/^(epilogue|afterword|postscript|终章|尾声|后记)\b/i.test(raw) && !/chapter\s*\d+/i.test(raw)) {
              return 999999 + idx * 0.001;
            }

            // 3. Volume / Book + Chapter: "Volume 2 Chapter 15" -> 2 * 100000 + 15
            const volChMatch = raw.match(/vol(?:ume)?\.?\s*(\d+).*?ch(?:apter)?\.?\s*(\d+(?:\.\d+)?)/i);
            if (volChMatch) {
              return parseFloat(volChMatch[1]) * 100000 + parseFloat(volChMatch[2]);
            }

            // 4. Standard "Chapter 123", "Ch. 123", "c123", "第123章", or leading number
            const chMatch = raw.match(/(?:chapter|ch\.?|ep\.?|episode|c|part)\s*(\d+(?:\.\d+)?)/i) ||
                            raw.match(/第\s*(\d+)\s*[章话話集]/) ||
                            raw.match(/^(\d+(?:\.\d+)?)\b/);
            if (chMatch) {
              return parseFloat(chMatch[1]);
            }

            // If no explicit number, keep original relative index
            return idx;
          };

          const chaptersWithWeights = base.chapters.map((c, originalIdx) => ({
            chapter: c,
            weight: parseChapterWeight(c.title || '', originalIdx),
            originalIdx
          }));

          chaptersWithWeights.sort((a, b) => {
            if (a.weight !== b.weight) return a.weight - b.weight;
            return a.originalIdx - b.originalIdx;
          });

          const sorted = chaptersWithWeights.map(x => x.chapter);
          syncCrawlSessionChapters(sorted);
          return { ...base, chapters: sorted };
        });
        toast('✨ Chapters auto-sorted chronologically!', 'success');
      };

      const reverseImportChapters = () => {
        setWebImportData(prev => {
          const base = prev || activeCrawlSession;
          if (!base || !base.chapters || base.chapters.length <= 1) return prev;
          const chapters = [...base.chapters].reverse();
          syncCrawlSessionChapters(chapters);
          return { ...base, chapters };
        });
        toast('Chapters order reversed (1 ↔ N).', 'info');
      };

      const aiReorderImportChapters = async () => {
        const currentData = webImportData || activeCrawlSession;
        if (!currentData || !currentData.chapters || currentData.chapters.length <= 1) {
          toast('No chapters to reorder.', 'info');
          return;
        }

        const key = getActiveApiKey('gemini') || getActiveApiKey(provider);
        if (!key) {
          toast('Please add an API key in Settings for AI Reorder, or use Auto-Sort.', 'error');
          return;
        }

        setIsAiSorting(true);
        toast('🤖 AI analyzing chapter reading order...', 'info');

        try {
          const titleItems = currentData.chapters.map((c, i) => `${i}: "${(c.title || `Chapter ${i + 1}`).replace(/"/g, "'")}"`);
          const systemPrompt = "You are an expert novel editor and reading order analyzer. The user will provide a list of chapter titles with their 0-based indices from an imported web novel. Some chapters may be out of chronological reading order (such as a latest release teaser or side story placed at the top, or prologue out of place).\\n\\nOutput a valid JSON array of the original integer indices arranged in their proper, chronological reading order (from first chapter to last chapter).\\nInclude every single index from 0 to N-1 exactly once. Output ONLY the raw JSON array (e.g. [1, 2, 3, 0]), with NO extra commentary or markdown backticks.";
          const userPrompt = `Reorder these ${currentData.chapters.length} chapter titles into proper chronological reading order:\\n${titleItems.join('\\n')}`;

          let jsonStr = '';
          if (provider === 'deepseek') {
            const r = await fetchRetry('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
              body: JSON.stringify({
                model: useCustomDeepseekModel && customDeepseekModel ? customDeepseekModel : 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                stream: false
              })
            });
            if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`API error ${r.status}: ${b.substring(0, 150)}`); }
            const j = await r.json();
            jsonStr = j.choices?.[0]?.message?.content || '';
          } else {
            const model = useCustomModel && customModel ? customModel : geminiModel;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const r = await fetchRetry(url, {
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
            if (!r.ok) { const b = await r.text().catch(() => ''); throw new Error(`Gemini API error ${r.status}: ${b.substring(0, 150)}`); }
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

          if (orderArray.length !== currentData.chapters.length) {
            throw new Error(`AI returned ${orderArray.length} items (expected ${currentData.chapters.length}). Using Auto-Sort.`);
          }

          const indexSet = new Set(orderArray);
          if (indexSet.size !== currentData.chapters.length) {
            throw new Error('AI returned duplicate indices. Using Auto-Sort.');
          }

          setWebImportData(prev => {
            const base = prev || activeCrawlSession;
            if (!base || !base.chapters) return prev;
            const reordered = orderArray.map(idx => base.chapters[idx]);
            syncCrawlSessionChapters(reordered);
            return { ...base, chapters: reordered };
          });

          toast('✨ AI successfully reorganized chapters in reading order!', 'success');
          try {
            window.NativeBridge?.showCompletionNotification?.('Chapters Sorted! 🤖', `Successfully reorganized ${orderArray.length} chapters into reading order.`);
          } catch(e) {}
        } catch (aiErr) {
          console.warn('AI Reorder error:', aiErr);
          toast('AI sort notice: ' + aiErr.message + '. Running instant Auto-Sort instead.', 'warn');
          autoSortImportChapters();
        } finally {
          setIsAiSorting(false);
        }
      };

      const handleExportRow = async (kind) => {
        if (isTranslating) {
          toast('Translation is in progress. Please pause or wait for completion before exporting.', 'warning');
          return;
        }
        if (kind === 'epub') { setSheetOpen(false); await handleDownloadEPUB(); return; }
        if (kind === 'reader') {
          setSheetOpen(false);
          const res = await handleDownloadEPUB();
          if (res && res.fileName) {
            const opened = await window.NativeBridge?.openWithReader(res.fileName, res.path);
            if (!opened) toast('EPUB saved to Downloads! Tap to open with your favorite reader.', 'info');
          }
          return;
        }
        if (kind === 'pdf') { setSheetOpen(false); await handleDownloadPDF(); return; }
        if (kind === 'docx') { setSheetOpen(false); await handleDownloadDOCX(); return; }
      };

      const switchRow = (label, checked, onChange) => h('div', { className: 'set-row' },
        h('span', { className: 'l' }, label),
        h('button', { type: 'button', className: `switch ${checked ? 'on' : ''}`, onClick: () => onChange(!checked), 'aria-pressed': checked })
      );

      const chipSelectStyle = { background: 'var(--void)', border: '1px solid var(--hairline)', color: 'var(--paper-dim)', borderRadius: 8, padding: '4px 6px', fontSize: 11, outline: 'none', maxWidth: 170 };

      const glossaryTermCount = (terminology || '').split(/\r?\n/).filter(l => l.trim().startsWith('-')).length;

      const tabTitle = activeTab === 'text' ? 'Translate' : activeTab === 'web_importer' ? 'Import' : activeTab === 'studio' ? 'Studio' : activeTab === 'history' ? 'Library' : 'Settings';
      const tabSub = activeTab === 'text'
        ? `${provider.toUpperCase()} · ${provider === 'gemini' ? geminiModel : provider === 'deepseek' ? deepseekModel : provider}`
        : activeTab === 'web_importer' ? 'AO3 · Lofter · Syosetu · Witch Cult'
        : activeTab === 'studio' ? 'Lossless EPUB Splitter & Merger'
        : activeTab === 'history' ? 'Novel Library & Saved Sessions'
        : 'API Keys, Typography & Sync';

      const navItems = [['text', 'Translate', Languages], ['web_importer', 'Import', Globe], ['studio', 'Studio', Layers], ['history', 'Library', Library], ['settings', 'Settings', Settings]];
      const fontThemes = [{ id: 'literata', label: 'Literata' }, { id: 'georgia', label: 'Georgia' }, { id: 'inter', label: 'Inter' }, { id: 'none', label: 'Default' }];

      return h(React.Fragment, null,
        h('div', { className: 'tl-app' },

          // ── HEADER ──
          h('header', { className: 'tl-head' },
            h('div', { className: 'tl-head-inner' },
              h('div', null,
                h('div', { className: 'tl-title' }, tabTitle),
                h('div', { className: 'tl-subtitle' }, tabSub)
              ),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                h('button', { type: 'button', className: 'version-chip', title: 'Check for updates', onClick: () => checkForAppUpdate(true) },
                  `v${appVersion}`, availableUpdate ? h('span', { className: 'dot' }) : null
                ),
                !isStandalone && h('button', { type: 'button', className: 'icon-btn', title: 'Install App on Device', onClick: handleInstallPWA }, ic(Download, 16))
              )
            )
          ),

          // ── UPDATE BANNER ──
          availableUpdate && h('div', { className: 'tl-wrap', style: { marginTop: 16 } },
            h('div', { className: 'card', style: { borderColor: 'rgba(124,135,255,.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 0 } },
              h('div', null,
                h('div', { style: { fontWeight: 700, fontSize: 13 } }, `Update Ready: v${availableUpdate.latestVersion}`),
                h('div', { style: { fontSize: 11.5, color: 'var(--slate)' } }, 'Tap to install the latest features and fixes.')
              ),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
                h('button', { type: 'button', className: 'mini-btn', disabled: isUpdating, onClick: handlePerformUpdate }, isUpdating ? 'Downloading…' : '⚡ Update Now'),
                h('button', {
                  type: 'button',
                  className: 'mini-btn ghost',
                  title: 'Download APK directly using your device browser',
                  onClick: () => {
                    const apkUrl = availableUpdate?.apkUrl || "https://github.com/ExZyO/Gemini-Translator/releases/latest/download/GeminiTranslator.apk";
                    window.AppLogger?.log('info', 'Updater', 'Opening browser download: ' + apkUrl);
                    window.open(apkUrl, '_blank');
                  }
                }, '🌐 Browser Download'),
                h('button', { type: 'button', className: 'icon-btn', onClick: () => setAvailableUpdate(null) }, '✕')
              )
            )
          ),

          h('main', { className: 'tl-wrap', style: { paddingTop: 16 } },

            // ═══ TAB 1: TRANSLATE ═══
            activeTab === 'text' && h(TabTranslate, {
              error,
              setError,
              srcLang,
              setSrcLang,
              tgtLang,
              setTgtLang,
              handleSwapLanguages,
              chunkSizePreset,
              concurrency,
              inputText,
              setInputText,
              handleInputChange,
              inputCharCount,
              inputTokenCount,
              inputRef,
              fileInputRef,
              uploadingFile,
              processFile,
              onDragOver,
              onDragLeave,
              onDrop,
              isDragOver,
              handlePasteFromClipboard,
              inputBoxHeight,
              glossaryCardOpen,
              setGlossaryCardOpen,
              glossaryTermCount,
              applyGlossaryPreset,
              newGlossaryName,
              setNewGlossaryName,
              handleSaveGlossary,
              activeGlossaryId,
              setActiveGlossaryId,
              handleLoadGlossary,
              handleDeleteGlossary,
              handleUnloadGlossary,
              savedGlossaries,
              defaultGlossaryName,
              setDefaultGlossaryName,
              clearDefaultGloss,
              smartGlossary,
              setSmartGlossary,
              setGlossaryEditorOpen,
              handleOpenAutoGlossary,
              handleRunConsistencyCheck,
              isAuditingConsistency,
              customInstructions,
              setCustomInstructions,
              instructionsRef,
              terminology,
              setTerminology,
              savedTranslationSession,
              isTranslationPaused,
              activeSession,
              activeSessionRef,
              resumeSavedTranslation,
              discardSavedTranslation,
              chapters,
              setChapters,
              isTranslating,
              progress,
              progressLabel,
              elapsedSec,
              handlePauseTranslation,
              cancelTranslation,
              assembledText,
              setAssembledText,
              handleAssembledTextChange,
              translatedChapters,
              setTranslatedChapters,
              outputWordCount,
              outputRef,
              outputBoxHeight,
              handleOpenActiveQaModal,
              handleOpenDiffModal,
              copyText,
              handleDownloadEPUB,
              handleSaveTranslationToLibrarySpace,
              activeNovelRecord,
              activeCrawlSession,
              webImportData,
              webImportHistory,
              currentDocCover,
              setCurrentDocCover,
              currentDocTitle,
              fileName,
              handleCoverFileSelect,
              handleLnoriDirectEpubDownload,
              setReaderChapterIdx,
              setReaderNovelId,
              setReaderNovelTitle,
              setReaderOpen,
              lastUsageStats,
              setLastUsageStats,
              showLiveLogs,
              setShowLiveLogs,
              liveLogs,
              logsContainerRef,
              copyDiagnosticsReport,
              copyLogsWithReport,
              setLogsModalOpen,
              handleStartTranslation,
              handleOpenCostEstimator,
              setSheetOpen,
              setActiveTab,
              setWebImportUrl,
              disabled,
              renderBoxResizeBar,
              switchRow
            }),

            // ═══ TAB 2: WEB IMPORTER ═══
            activeTab === 'web_importer' && h(TabImporter, {
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
              cleanBookTitle,
              cleanBookAuthor,
              generateEpubFromChapters,
              getEpubFileName,
              getEpubOptions,
              getNovelFolderOptions,
              saveUniversalBlob,
              InfoTooltip
            }),

            // ═══ TAB 3: EPUB STUDIO ═══
            activeTab === 'studio' && h(TabStudio, {
              studioSubTab,
              setStudioSubTab,
              activeTab
            }),

            // ═══ TAB 4: LIBRARY ═══
            activeTab === 'history' && h(TabLibrary, {
              activeSession,
              activeSessionRef,
              libQuery,
              setLibQuery,
              epubRestoreInputRef,
              ongoingEpubInputRef,
              handleRestoreFromEpubFiles,
              handleSelectOngoingEpubFile,
              libTab,
              setLibTab,
              allCountLabel,
              filteredAudiobooks,
              savedSpaceCount,
              transCount,
              incCount,
              loadTrashCount,
              trashCount,
              trashList,
              savedAudiobooks,
              setSavedAudiobooks,
              confirmAction,
              audioPlayerState,
              setIsFullPlayerOpen,
              handleStartPlayAudiobook,
              handleOpenAudioDownload,
              removeAudiobookFromLibrary,
              displayedBooks,
              handleClearSavedSpace,
              handleClearScopedBooks,
              handleCheckAllUpdates,
              isBatchChecking,
              checkingUpdates,
              downloadingUpdates,
              handleEmptyTrash,
              handleRestoreAllTrash,
              savedTranslationSession,
              isTranslationPaused,
              resumeSavedTranslation,
              discardSavedTranslation,
              handleUpdateTranslateAndMakeEpub,
              handleDownloadNewChapters,
              loadFullNovel,
              setActiveTab,
              setStudioSubTab,
              handleCheckNovelUpdate,
              handleOpenContinuationForNovel,
              currentDocCover,
              setActiveBookMenuNovel,
              setReaderNovelId,
              setReaderNovelTitle,
              setReaderChapterIdx,
              setReaderOpen,
              setAssembledText,
              setChapters,
              setInputText,
              setTranslatedChapters,
              translatedChapters,
              generateEpubFromChapters,
              getNovelFolderOptions,
              setEpubPackagingModal,
              getEpubFileName,
              getEpubOptions,
              handleRestoreNovel,
              handlePermanentDelete,
              clearAllNovelHistory,
              libCollapsed,
              setLibCollapsed,
              history,
              filteredHistory,
              loadFromHistory,
              deleteHistoryItem,
              clearHistory,
              webImportHistory,
              novelUpdateBadges
            }),

            // ═══ TAB 5: SETTINGS ═══
            activeTab === 'settings' && h(TabSettings, {
              appVersion,
              appVersionCode,
              checkForAppUpdate,
              downloadedOnly,
              setDownloadedOnly,
              incognitoMode,
              setIncognitoMode,
              settingsCategory,
              setSettingsCategory,
              provider,
              setProvider,
              apiKeysByProvider,
              activeKeyIds,
              showKeys,
              setShowKeys,
              addApiKey,
              deleteApiKey,
              updateApiKey,
              setActiveKey,
              testSingleKey,
              handleTestAllKeys,
              keyHealth,
              testingKeys,
              setBulkKeyModalOpen,
              libreUrl,
              setLibreUrl,
              geminiModel,
              setGeminiModel,
              deepseekModel,
              setDeepseekModel,
              customModel,
              setCustomModel,
              useCustomModel,
              setUseCustomModel,
              customDeepseekModel,
              setCustomDeepseekModel,
              useCustomDeepseekModel,
              setUseCustomDeepseekModel,
              enableStreaming,
              setEnableStreaming,
              enableThinking,
              setEnableThinking,
              strictModel,
              setStrictModel,
              concurrency,
              setConcurrency,
              contextAware,
              setContextAware,
              chunkSizePreset,
              setChunkSizePreset,
              handleOpenSourcePluginsModal,
              healthAuditEnabled,
              setHealthAuditEnabled,
              qaProofreaderEnabled,
              setQaProofreaderEnabled,
              cjkLeakCheckEnabled,
              setCjkLeakCheckEnabled,
              antiMtlGateEnabled,
              setAntiMtlGateEnabled,
              translationMemoryEnabled,
              setTranslationMemoryEnabled,
              refreshTmStats,
              tmStats,
              handleClearTm,
              handleExportTmx,
              snapshotsEnabled,
              setSnapshotsEnabled,
              culturalFootnotesEnabled,
              setCulturalFootnotesEnabled,
              amoledMode,
              setAmoledMode,
              deviceWakeLock,
              setDeviceWakeLock,
              epubDropCaps,
              setEpubDropCaps,
              epubSmartQuotes,
              setEpubSmartQuotes,
              epubCleanWebArtifacts,
              setEpubCleanWebArtifacts,
              epubFontTheme,
              setEpubFontTheme,
              epubJustifyText,
              setEpubJustifyText,
              epubIncludeImages,
              setEpubIncludeImages,
              epubFixedFilename,
              setEpubFixedFilename,
              storageDiag,
              storageLoading,
              refreshStorageDiag,
              history,
              webImportHistory,
              exportFullBackup,
              importFullBackup,
              pasteAndRestoreBackup,
              trashCount,
              handleEmptyTrash,
              cloudProvider,
              setCloudProvider,
              webdavUrl,
              setWebdavUrl,
              webdavUser,
              setWebdavUser,
              webdavPass,
              setWebdavPass,
              webdavPath,
              setWebdavPath,
              webdavAutoSync,
              setWebdavAutoSync,
              webdavTesting,
              webdavSyncing,
              webdavLastSync,
              testWebDavConnection,
              backupToWebDav,
              restoreFromWebDav,
              gdriveConnected,
              gdriveUser,
              gdriveFolderMode,
              setGdriveFolderMode,
              gdriveAutoSync,
              setGdriveAutoSync,
              gdriveLastSync,
              gdriveTesting,
              gdriveSyncing,
              setGdriveConfigModalOpen,
              testGoogleDriveConnection,
              backupToGoogleDrive,
              restoreFromGoogleDrive,
              connectGoogleDrive,
              backupToGoogleDriveFile,
              disconnectGoogleDrive,
              opdsRunning,
              opdsUrl,
              opdsWifiUrl,
              toggleOpdsServer,
              telemetryEnabled,
              setTelemetryEnabled,
              telemetryVerbose,
              setTelemetryVerbose,
              telemetryServerUrl,
              setTelemetryServerUrl,
              telemetryTesting,
              telemetryStatus,
              telemetryStatusMsg,
              handleTestTelemetryConnection,
              handleClearTelemetryServer,
              showLiveLogs,
              setShowLiveLogs,
              setLogsModalOpen,
              handleInstallPWA,
              confirmAction,
              DEFAULT_GEMINI_MODELS,
              DEFAULT_DEEPSEEK_MODELS
            })
          ),

        // ── BOTTOM NAV ──
          h('nav', { className: 'bottomnav' },
            navItems.map(([key, label, Icon]) => {
              const isActive = activeTab === key;
              return h('button', {
                key,
                type: 'button',
                className: `nav-item ${isActive ? 'active' : ''}`,
                onClick: () => {
                  setActiveTab(key);
                  localStorage.setItem('activeTab', key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }, ic(Icon, 18), h('span', null, label));
            })
          )
        ),

        // ── EXPORT / TOOLS SHEET ──
        h(ExportToolsSheet, {
          sheetOpen,
          setSheetOpen,
          handleExportRow,
          isTranslating,
          handleAutoDetectSplit,
          setBoxPreset,
          setGlossaryEditorOpen,
          toast
        }),

        // ── GLOSSARY FULL-SCREEN EDITOR ──
        
        // ═════ DIAGNOSTICS & TELEMETRY LOGS MODAL ═════
        h(DiagnosticsLogsModal, {
          isOpen: logsModalOpen,
          onClose: () => setLogsModalOpen(false),
          liveLogs,
          copyLogsWithReport
        }),

        // ═════ BULK API KEY IMPORT MODAL ═════
        h(BulkApiKeyImportModal, {
          isOpen: bulkKeyModalOpen,
          onClose: () => setBulkKeyModalOpen(false),
          provider,
          bulkKeyText,
          setBulkKeyText,
          onImport: handleBulkImportKeys
        }),

        // ═════ GLOSSARY FULL-SCREEN EDITOR MODAL ═════
        h(GlossaryEditorModal, {
          isOpen: glossaryEditorOpen,
          onClose: () => setGlossaryEditorOpen(false),
          terminology,
          setTerminology,
          glossaryTermCount,
          activeGlossaryId,
          handleSaveGlossary,
          applyGlossaryPreset,
          handleAiOptimizeGlossary,
          isOptimizingGlossary,
          importGlossaryFile,
          exportGlossaryTxt,
          smartGlossary,
          setSmartGlossary
        }),

        // ── TOASTS ──
        h('div', { className: 'toast-wrap' },
          toasts.map(t => h('div', {
            key: t.id,
            className: `toast ${t.type || 'success'}`,
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }
          },
            h('span', { style: { flex: 1 } }, t.msg),
            t.action && h('button', {
              type: 'button',
              className: 'mini-btn',
              style: {
                background: '#ffffff',
                color: '#111827',
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 6,
                cursor: 'pointer',
                border: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                flexShrink: 0
              },
              onClick: (e) => {
                e.stopPropagation();
                if (typeof t.action.onClick === 'function') t.action.onClick();
                setToasts(p => p.filter(item => item.id !== t.id));
              }
            }, t.action.label || 'Undo')
          ))
        ),

        // ── CONFIRM DIALOG ──
        h(ConfirmDialog, {
          showModal,
          setShowModal,
          modalMessage,
          modalCallback,
          setModalCallback
        }),

        // ── EPUB PACKAGING PROGRESS DOCK (Main Screen, Non-Modal, Dismissible) ──
        h(EpubPackagingProgressDock, {
          epubPackagingModal,
          setEpubPackagingModal
        }),

        // ── DOWNLOAD SUCCESS MODAL ──
        h(DownloadSuccessModal, {
          downloadSuccessModal,
          setDownloadSuccessModal
        }),

        // ── READER ──
        h(MoonReaderModal, {
          open: readerOpen,
          onClose: () => setReaderOpen(false),
          text: assembledText,
          chapters: getExportChapters(),
          currentIdx: readerChapterIdx,
          onChapterChange: setReaderChapterIdx,
          theme: readerTheme,
          setTheme: setReaderTheme,
          font: readerFont,
          setFont: setReaderFont,
          fontSize: readerFontSize,
          setFontSize: setReaderFontSize,
          tgtLang,
          novelId: readerNovelId,
          novelTitle: readerNovelTitle,
          onVerifyConsistency: handleRunConsistencyCheck,
          onOpenHealthAudit: handleOpenActiveQaModal,
          onOpenDiff: (idx) => handleOpenDiffModal(idx ?? readerChapterIdx)
        }),

        // ── LIBRARY NOVEL ACTION SHEET (3-DOT MENU) ──
        h(LibraryNovelActionSheet, {
          novel: activeBookMenuNovel,
          onClose: () => setActiveBookMenuNovel(null),
          getNovelFolderOptions,
          setRenameModalNovel,
          setNewNovelTitleInput,
          getCustomTitle,
          loadFullNovel,
          setActiveTab,
          setStudioSubTab,
          handleCheckNovelUpdate,
          handleOpenContinuationForNovel,
          handleOpenAutoGlossary,
          toggleNovelSavedSpace,
          handleSetNovelFolder,
          handleOpenNovelHealthModal,
          handleOpenDiffModal,
          handleEnrichNovelMetadata,
          handleSplitNovelIntoArcs,
          confirmAction,
          deleteNovelFromHistory
        }),

        // ── ONGOING EPUB CONTINUATION & MOON+ READER CONTINUITY FULL-SCREEN VIEW ──
        h(OngoingEpubContinuationModal, {
          modalData: ongoingEpubModal,
          onClose: () => setOngoingEpubModal(null),
          setOngoingEpubModal,
          updateNovelFolderRecord,
          handleScanContinuationToc,
          handleSearchContinuationSources,
          handleSelectContinuationSource,
          handleExecuteContinuation
        }),

        // ── NOVEL HEALTH & TRANSLATION QA REPORT MODAL (§5.9 + §7.1 + §7.5) ──
        h(QaReportModal, {
          isOpen: qaModalOpen,
          onClose: () => setQaModalOpen(false),
          qaAuditResult,
          qaFilterCategory,
          setQaFilterCategory,
          qaCheckGaps, setQaCheckGaps,
          qaCheckCorrupt, setQaCheckCorrupt,
          qaCheckCjk, setQaCheckCjk,
          qaCheckAntiMtl, setQaCheckAntiMtl,
          qaCheckLoops, setQaCheckLoops,
          qaCheckDuplicates, setQaCheckDuplicates,
          qaAuditNovelRef,
          runNovelHealthAudit,
          onInspectChapterInReader: (iss) => {
            const targetNovel = qaAuditNovelRef;
            if (targetNovel && targetNovel.chapters && targetNovel.chapters.length > 0) {
              const chs = targetNovel.chapters;
              const isTrans = targetNovel.isTranslated || (targetNovel.title || '').includes('(Translated)') || chs.some(c => c && (c.translated || c.targetLang || c.content));
              const cleanCh = c => typeof c === 'string' ? c : (c.content || c.text || c.rawContent || '');
              const cleanedChs = chs.map((c, i) => ({
                title: (typeof c === 'object' && c.title) ? c.title : `Chapter ${i + 1}`,
                content: cleanCh(c)
              }));
              if (targetNovel.title) {
                setCurrentDocTitle(targetNovel.title);
                setFileName(targetNovel.title);
              }
              setActiveNovelRecord(targetNovel);
              if (isTrans) {
                setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
                setTranslatedChapters(cleanedChs);
                if (targetNovel.originalChapters && targetNovel.originalChapters.length > 0) {
                  const srcChs = targetNovel.originalChapters;
                  setInputText(srcChs.map(c => `# ${c.title || ''}\n\n${cleanCh(c)}`).join('\n\n'));
                  setChapters(srcChs.map((c, i) => ({ title: c.title || `Chapter ${i + 1}`, content: cleanCh(c) })));
                }
              } else {
                setChapters(cleanedChs);
                setInputText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
                setAssembledText(cleanedChs.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n'));
                setTranslatedChapters(cleanedChs);
              }
            }
            setReaderChapterIdx(Math.max(0, iss.chapterIdx || 0));
            setReaderOpen(true);
            setQaModalOpen(false);
          }
        }),

        // ── TRANSLATION DIFF & REVISION HISTORY MODAL (§8.6) ──
        h(DiffHistoryModal, {
          isOpen: diffModalOpen,
          onClose: () => setDiffModalOpen(false),
          activeDiffData,
          selectedDiffSnapId,
          handleSelectDiffSnapshot,
          diffSnapshotsList,
          handleManualSnapshot,
          handleRollbackDiffSnapshot
        }),

        // ── AUTO-GLOSSARY & CHARACTER EXTRACTOR MODAL ──
        h(AutoGlossaryModal, {
          isOpen: autoGlossaryModalOpen,
          onClose: () => { setAutoGlossaryModalOpen(false); setAutoGlossaryTargetNovel(null); },
          autoGlossaryTargetNovel,
          chapters,
          activeNovelRecord,
          autoGlossaryChapterCount,
          setAutoGlossaryChapterCount,
          isExtractingGlossary,
          handleExtractGlossary,
          extractedTerms,
          setExtractedTerms,
          handleApplyExtractedTerms
        }),



        // ── NAME CONSISTENCY VERIFIER MODAL ──
        h(NameConsistencyModal, {
          isOpen: consistencyModalOpen,
          onClose: () => setConsistencyModalOpen(false),
          consistencyAuditResults,
          handleBatchFixDrift,
          handleRunConsistencyCheck,
          isAuditingConsistency
        }),

        // ── GOOGLE DRIVE CONFIGURATION MODAL ──
        h(GdriveConfigModal, {
          isOpen: gdriveConfigModalOpen,
          onClose: () => setGdriveConfigModalOpen(false),
          gdriveClientId,
          setGdriveClientId,
          gdriveManualToken,
          setGdriveManualToken,
          setGdriveConnected,
          testGoogleDriveConnection
        }),

        // ── SWIFTAUDIO PLAYER (FLOATING MINI-PLAYER, FULL PLAYER, BATCH DOWNLOAD) ──
        h(SwiftAudioPlayer, {
          audioPlayerState,
          amoledMode,
          isFullPlayerOpen,
          setIsFullPlayerOpen,
          isPlayerFullscreen,
          setIsPlayerFullscreen,
          isAudiobookInLibrary,
          saveAudiobookToLibrary,
          removeAudiobookFromLibrary,
          handleOpenAudioDownload,
          downloadingTrackId,
          setDownloadingTrackId,
          audioDownloadModal,
          setAudioDownloadModal,
          getNovelFolderOptions,
          handleExecuteAudioBatchDownload
        }),

        // ── NOVEL RENAME MODAL ──
        h(NovelRenameModal, {
          novel: renameModalNovel,
          onClose: () => setRenameModalNovel(null),
          value: newNovelTitleInput,
          setValue: setNewNovelTitleInput,
          onSave: (novel, val) => {
            handleSaveNovelRename(novel, val);
            setRenameModalNovel(null);
          }
        }),

        // ── SOURCE EXTENSIONS & SOURCES HUB (FULL-SCREEN MIHON-STYLE) ──
        h(SourceExtensionsModal, {
          isOpen: sourcePluginsModalOpen,
          onClose: () => setSourcePluginsModalOpen(false),
          pluginSelectedTab,
          setPluginSelectedTab,
          pluginCatalog,
          isCatalogLoading,
          pluginSearchQuery,
          setPluginSearchQuery,
          pluginSelectedLangFilter,
          setPluginSelectedLangFilter,
          installingPluginId,
          handleUninstallPlugin,
          handleInstallPlugin,
          customPluginUrl,
          setCustomPluginUrl,
          handleInstallCustomPluginUrl
        }),

        // ── COST & TIME ESTIMATOR MODAL (§7.2 / §3.6) ──
        h(CostEstimatorModal, {
          isOpen: costEstimatorModalOpen,
          costEstimatorData,
          onClose: () => setCostEstimatorModalOpen(false),
          onProceed: () => {
            setCostEstimatorModalOpen(false);
            handleStartTranslation();
          }
        }),

        // ── EPUB STUDIO PREVIEW MODAL ──
        h('div', { dangerouslySetInnerHTML: { __html: window.modalHtml || (typeof modalHtml !== 'undefined' ? modalHtml : '') } })
      );
    }


    const root = document.getElementById('root');
    if (root) ReactDOM.createRoot(root).render(h(ErrorBoundary, null, h(App)));