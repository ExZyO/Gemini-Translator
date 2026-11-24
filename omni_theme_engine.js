/**
 * omni_theme_engine.js - Pure-AMOLED Semantic Palette Engine & Artwork Resolver
 * Manages OmniTrack's 14 palettes (Monochrome WHITE default), live CSS custom properties,
 * layout switches (Library, Book Details, Discover), and non-destructive Artwork pan/zoom.
 */
(function (root, factory) {
  const exports = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  }
  if (root && typeof root === 'object') {
    root.OmniThemeEngine = exports.OmniThemeEngine;
    root.ArtworkModelResolver = exports.ArtworkModelResolver;
  }
  if (typeof window !== 'undefined') {
    window.OmniThemeEngine = exports.OmniThemeEngine;
    window.ArtworkModelResolver = exports.ArtworkModelResolver;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PALETTES = [
    { id: 'WHITE', name: 'Monochrome', accent: '#F5F5F5', variant: '#C8C4BC', onAccent: '#000000' },
    { id: 'GOLD', name: 'Obsidian Gold', accent: '#E8C26A', variant: '#C6963B', onAccent: '#000000' },
    { id: 'CRIMSON', name: 'Crimson', accent: '#F43F5E', variant: '#BE123C', onAccent: '#FFFFFF' },
    { id: 'OCEAN', name: 'Ocean', accent: '#38BDF8', variant: '#0284C7', onAccent: '#000000' },
    { id: 'VIOLET', name: 'Violet', accent: '#A855F7', variant: '#7E22CE', onAccent: '#FFFFFF' },
    { id: 'EMERALD', name: 'Emerald', accent: '#22D37C', variant: '#059669', onAccent: '#000000' },
    { id: 'AMBER', name: 'Amber', accent: '#FB923C', variant: '#EA580C', onAccent: '#000000' },
    { id: 'ROSE', name: 'Rose', accent: '#EC70A9', variant: '#BE185D', onAccent: '#000000' },
    { id: 'MESSENGER', name: 'Messenger', accent: '#168AFF', variant: '#0056D2', onAccent: '#FFFFFF' },
    { id: 'AMETHYST', name: 'Amethyst', accent: '#8B5CF6', variant: '#6D28D9', onAccent: '#FFFFFF' },
    { id: 'BLOSSOM', name: 'Blossom', accent: '#EC4899', variant: '#DB2777', onAccent: '#FFFFFF' },
    { id: 'LAGOON', name: 'Lagoon', accent: '#14B8A6', variant: '#0F766E', onAccent: '#000000' },
    { id: 'SUNSET', name: 'Sunset', accent: '#F97316', variant: '#C2410C', onAccent: '#000000' },
    { id: 'CUSTOM', name: 'Custom Dual-Hex', accent: '#E8C26A', variant: '#A855F7', onAccent: '#000000' }
  ];

  const PREF_SCHEMA = [
    { key: 'themeId', storage: 'omni_theme_id', type: 'string', def: 'WHITE' },
    { key: 'customHex1', storage: 'omni_custom_hex_1', type: 'hex', def: '#E8C26A' },
    { key: 'customHex2', storage: 'omni_custom_hex_2', type: 'hex', def: '#A855F7' },
    { key: 'libraryLayout', storage: 'omni_library_layout', type: 'enum', values: ['editorial', 'minimal'], def: 'editorial' },
    { key: 'detailsHeader', storage: 'omni_details_header', type: 'enum', values: ['jacket', 'split'], def: 'jacket' },
    { key: 'discoverLayout', storage: 'omni_discover_layout', type: 'enum', values: ['grid', 'rails'], def: 'grid' },
    { key: 'heroBlur', storage: 'omni_hero_blur', type: 'number', min: 0, max: 32, def: 24 },
    { key: 'glassSheen', storage: 'omni_glass_sheen', type: 'number', min: 0, max: 100, def: 70 },
    { key: 'posterRadius', storage: 'omni_poster_radius', type: 'number', min: 4, max: 16, def: 10 },
    { key: 'heroAutoscroll', storage: 'omni_hero_autoscroll', type: 'bool', def: true },
    { key: 'heroInterval', storage: 'omni_hero_interval', type: 'number', min: 3, max: 15, def: 6 }
  ];

  const PREF_KEYS = PREF_SCHEMA.map(function (s) { return s.storage; }).concat(['gemini_novel_artwork_map']);
  const subscribers = new Set();

  function sanitizeHex(val, fallback) {
    const clean = String(val || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toUpperCase();
    if (/^[0-9a-fA-F]{6}$/.test(clean)) return '#' + clean.toUpperCase();
    return fallback || '#E8C26A';
  }

  function hexToRgb(hex) {
    const h = sanitizeHex(hex, '#F5F5F5').slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function pickOnAccent(hex) {
    const rgb = hexToRgb(hex);
    const luma = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luma > 0.62 ? '#000000' : '#FFFFFF';
  }

  function readStorage(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return null;
  }

  function writeStorage(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, String(val));
      }
    } catch (_) {}
  }

  function parseField(schema, raw) {
    if (raw === null || raw === undefined || raw === '') return schema.def;
    if (schema.type === 'hex') return sanitizeHex(raw, schema.def);
    if (schema.type === 'enum') {
      return schema.values.includes(raw) ? raw : schema.def;
    }
    if (schema.type === 'bool') {
      if (typeof raw === 'boolean') return raw;
      return String(raw) !== 'false';
    }
    if (schema.type === 'number') {
      const n = Number(raw);
      if (!isFinite(n)) return schema.def;
      return Math.max(schema.min, Math.min(schema.max, n));
    }
    return String(raw);
  }

  function getPrefs() {
    const out = {};
    for (let i = 0; i < PREF_SCHEMA.length; i++) {
      const s = PREF_SCHEMA[i];
      out[s.key] = parseField(s, readStorage(s.storage));
    }
    return out;
  }

  function getPalette(id, prefsArg) {
    const prefs = prefsArg || getPrefs();
    const targetId = String(id || prefs.themeId || 'WHITE').toUpperCase();
    if (targetId === 'CUSTOM') {
      const accent = sanitizeHex(prefs.customHex1, '#E8C26A');
      const variant = sanitizeHex(prefs.customHex2, '#A855F7');
      return {
        id: 'CUSTOM',
        name: 'Custom Dual-Hex',
        accent: accent,
        variant: variant,
        onAccent: pickOnAccent(accent)
      };
    }
    return PALETTES.find(function (p) { return p.id === targetId; }) || PALETTES[0];
  }

  function applyThemeToDocument(prefsArg) {
    const prefs = prefsArg || getPrefs();
    const pal = getPalette(prefs.themeId, prefs);
    const rgb = hexToRgb(pal.accent);
    const rgbStr = rgb[0] + ', ' + rgb[1] + ', ' + rgb[2];
    const sheenAlpha = ((Number(prefs.glassSheen) || 0) / 100) * 0.24;

    if (typeof document !== 'undefined') {
      const docEl = document.documentElement;
      if (docEl && typeof docEl.setAttribute === 'function') {
        docEl.setAttribute('data-omni', 'true');
        if (readStorage('amoledMode') !== 'false') {
          docEl.setAttribute('data-theme', 'amoled');
        }
      }
      if (docEl && docEl.style && typeof docEl.style.setProperty === 'function') {
        docEl.style.setProperty('--omni-canvas', '#000000');
        docEl.style.setProperty('--omni-surface', '#070709');
        docEl.style.setProperty('--omni-chip-fill', 'rgba(255, 255, 255, 0.055)');
        docEl.style.setProperty('--omni-hairline', 'rgba(255, 255, 255, 0.08)');
        docEl.style.setProperty('--omni-jade', '#34D399');
        docEl.style.setProperty('--omni-accent', pal.accent);
        docEl.style.setProperty('--omni-accent-variant', pal.variant);
        docEl.style.setProperty('--omni-on-accent', pal.onAccent);
        docEl.style.setProperty('--omni-accent-rgb', rgbStr);
        docEl.style.setProperty('--omni-accent-soft', 'rgba(' + rgbStr + ', 0.14)');
        docEl.style.setProperty('--omni-hero-blur', prefs.heroBlur + 'px');
        docEl.style.setProperty('--omni-sheen-alpha', sheenAlpha.toFixed(3));
        docEl.style.setProperty('--omni-poster-radius', prefs.posterRadius + 'px');
        docEl.style.setProperty('--accent', pal.accent);
        docEl.style.setProperty('--iris', pal.accent);
        docEl.style.setProperty('--iris-deep', pal.variant);
      }
      if (document.body && document.body.classList && typeof document.body.classList.add === 'function') {
        document.body.classList.add('omni-active');
      }
    }
    return prefs;
  }

  function notifySubscribers(prefs) {
    subscribers.forEach(function (fn) {
      try { fn(prefs); } catch (_) {}
    });
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('omni-theme-change', { detail: prefs }));
      } catch (_) {}
    }
  }

  function findSchema(keyOrStorage) {
    return PREF_SCHEMA.find(function (s) {
      return s.key === keyOrStorage || s.storage === keyOrStorage;
    });
  }

  function setPref(keyOrStorage, value) {
    const schema = findSchema(keyOrStorage);
    if (!schema) return getPrefs();
    const parsed = parseField(schema, value);
    writeStorage(schema.storage, parsed);
    const next = getPrefs();
    applyThemeToDocument(next);
    notifySubscribers(next);
    return next;
  }

  function setPrefs(partial) {
    if (!partial || typeof partial !== 'object') return getPrefs();
    Object.keys(partial).forEach(function (k) {
      const schema = findSchema(k);
      if (schema) {
        writeStorage(schema.storage, parseField(schema, partial[k]));
      }
    });
    const next = getPrefs();
    applyThemeToDocument(next);
    notifySubscribers(next);
    return next;
  }

  function resetPrefs() {
    PREF_SCHEMA.forEach(function (s) {
      writeStorage(s.storage, s.def);
    });
    const next = getPrefs();
    applyThemeToDocument(next);
    notifySubscribers(next);
    return next;
  }

  function reload() {
    const next = getPrefs();
    applyThemeToDocument(next);
    notifySubscribers(next);
    return next;
  }

  function init() {
    const prefs = getPrefs();
    applyThemeToDocument(prefs);
    return prefs;
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    subscribers.add(fn);
    return function () {
      subscribers.delete(fn);
    };
  }

  function useOmniPrefs() {
    const ReactObj = (typeof React !== 'undefined' ? React : (typeof window !== 'undefined' ? window.React : null));
    const useStateFn = ReactObj && ReactObj.useState;
    const useEffectFn = ReactObj && ReactObj.useEffect;
    if (!useStateFn) return getPrefs();
    const pair = useStateFn(function () { return getPrefs(); });
    const state = pair[0];
    const setState = pair[1];
    if (useEffectFn) {
      useEffectFn(function () {
        setState(getPrefs());
        return subscribe(function (next) {
          setState(next);
        });
      }, []);
    }
    return state;
  }

  // ── Non-Destructive Artwork Resolver (Cover, Wide Banner, Pan & Zoom) ──
  const ARTWORK_MAP_KEY = 'gemini_novel_artwork_map';

  function getArtworkKey(book) {
    if (!book) return '';
    if (book.id) return String(book.id);
    if (book.title) return 't_' + String(book.title).trim().toLowerCase();
    return '';
  }

  function getArtworkMap() {
    try {
      const raw = readStorage(ARTWORK_MAP_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function mergeBookArtwork(book) {
    if (!book || typeof book !== 'object') return {};
    const map = getArtworkMap();
    const byId = book.id ? map[String(book.id)] : null;
    const byTitle = book.title ? map['t_' + String(book.title).trim().toLowerCase()] : null;
    const stored = byId || byTitle || {};
    return {
      customCover: book.customCover || book.customCoverUrl || stored.customCover || '',
      customBanner: book.customBanner || book.customBannerUrl || stored.customBanner || '',
      bannerFocalX: (typeof book.bannerFocalX === 'number') ? book.bannerFocalX : (typeof stored.bannerFocalX === 'number' ? stored.bannerFocalX : 0),
      bannerFocalY: (typeof book.bannerFocalY === 'number') ? book.bannerFocalY : (typeof stored.bannerFocalY === 'number' ? stored.bannerFocalY : 0),
      bannerZoom: (typeof book.bannerZoom === 'number') ? book.bannerZoom : (typeof stored.bannerZoom === 'number' ? stored.bannerZoom : 1),
      artworkRole: book.artworkRole || stored.artworkRole || 'auto',
      cover: book.cover || book.coverUrl || ''
    };
  }

  function preferredCover(book) {
    const art = mergeBookArtwork(book);
    return art.customCover || art.cover || '';
  }

  function preferredBanner(book) {
    const art = mergeBookArtwork(book);
    const cover = art.customCover || art.cover || '';
    const banner = art.customBanner || '';
    const role = art.artworkRole || 'auto';
    let mode = 'glow';
    let src = '';

    if (role === 'glow') {
      mode = 'glow';
      src = '';
    } else if (role === 'cover_as_banner') {
      if (cover) { mode = 'cover'; src = cover; }
    } else if (banner) {
      mode = 'banner';
      src = banner;
    } else if (cover) {
      mode = 'cover';
      src = cover;
    }

    return {
      src: src,
      mode: mode,
      focalX: Math.max(-1, Math.min(1, Number(art.bannerFocalX) || 0)),
      focalY: Math.max(-1, Math.min(1, Number(art.bannerFocalY) || 0)),
      zoom: Math.max(1, Math.min(2.5, Number(art.bannerZoom) || 1))
    };
  }

  function getBannerImgStyle(book, blurPxOverride) {
    const info = preferredBanner(book);
    const prefs = getPrefs();
    const rawBlur = (typeof blurPxOverride === 'number') ? blurPxOverride : Number(prefs.heroBlur);
    // Custom wide banners stay sharp unless the user opts into stronger hero blur
    const effectiveBlur = info.mode === 'banner' ? Math.round(rawBlur * 0.25) : rawBlur;
    const fx = info.focalX;
    const fy = info.focalY;
    const z = info.zoom;
    const effZ = (z <= 1.01 && (Math.abs(fx) > 0.01 || Math.abs(fy) > 0.01)) ? 1.24 : z;
    const maxShift = Math.max(0, ((effZ - 1) / (2 * effZ)) * 100);
    const tx = (-fx * maxShift).toFixed(2);
    const ty = (-fy * maxShift).toFixed(2);

    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transformOrigin: 'center center',
      transform: 'scale(' + effZ.toFixed(3) + ') translate(' + tx + '%, ' + ty + '%)',
      filter: effectiveBlur > 0 ? 'blur(' + effectiveBlur + 'px) saturate(1.18)' : 'saturate(1.06)',
      willChange: 'transform'
    };
  }

  function compressImageDataUrl(fileOrDataUrl, maxDim, quality) {
    const limitDim = maxDim || 960;
    const q = quality || 0.82;
    return new Promise(function (resolve, reject) {
      const readUrl = function (dataUrl) {
        if (typeof Image === 'undefined' || typeof document === 'undefined') {
          resolve(dataUrl);
          return;
        }
        const img = new Image();
        img.onload = function () {
          try {
            let w = img.naturalWidth || img.width || limitDim;
            let h = img.naturalHeight || img.height || limitDim;
            if (w > limitDim || h > limitDim) {
              if (w >= h) {
                h = Math.round((h * limitDim) / w);
                w = limitDim;
              } else {
                w = Math.round((w * limitDim) / h);
                h = limitDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', q));
          } catch (_) {
            resolve(dataUrl);
          }
        };
        img.onerror = function () { resolve(dataUrl); };
        img.src = dataUrl;
      };

      if (typeof fileOrDataUrl === 'string') {
        readUrl(fileOrDataUrl);
      } else if (fileOrDataUrl && typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = function (ev) { readUrl(ev.target.result); };
        reader.onerror = function (err) { reject(err); };
        reader.readAsDataURL(fileOrDataUrl);
      } else {
        reject(new Error('Unsupported image source'));
      }
    });
  }

  async function saveBookArtwork(book, patch, callbacks) {
    if (!book) return null;
    const cb = callbacks || {};
    const fields = {
      customCover: patch.customCover !== undefined ? patch.customCover : (book.customCover || ''),
      customBanner: patch.customBanner !== undefined ? patch.customBanner : (book.customBanner || ''),
      bannerFocalX: patch.bannerFocalX !== undefined ? Number(patch.bannerFocalX) : (Number(book.bannerFocalX) || 0),
      bannerFocalY: patch.bannerFocalY !== undefined ? Number(patch.bannerFocalY) : (Number(book.bannerFocalY) || 0),
      bannerZoom: patch.bannerZoom !== undefined ? Number(patch.bannerZoom) : (Number(book.bannerZoom) || 1),
      artworkRole: patch.artworkRole !== undefined ? patch.artworkRole : (book.artworkRole || 'auto')
    };

    const updatedBook = Object.assign({}, book, fields);

    // 1. Persist to GeminiNovelDB (full authoritative store)
    if (typeof window !== 'undefined' && window.GeminiNovelDB && book.id) {
      try {
        const existing = window.GeminiNovelDB.getNovel ? await window.GeminiNovelDB.getNovel(book.id) : null;
        if (existing) {
          const merged = Object.assign({}, existing, fields);
          if (window.GeminiNovelDB.updateNovel) {
            await window.GeminiNovelDB.updateNovel(merged);
          } else if (window.GeminiNovelDB.saveNovel) {
            await window.GeminiNovelDB.saveNovel(merged);
          }
        } else if (window.GeminiNovelDB.saveNovel) {
          await window.GeminiNovelDB.saveNovel(updatedBook);
        }
      } catch (e) {
        console.warn('[ArtworkModelResolver] GeminiNovelDB save warning:', e);
      }
    }

    // 2. Persist compact artwork map to localStorage (safely guarding size/quota)
    try {
      const map = getArtworkMap();
      const lightFields = {
        customCover: (fields.customCover && fields.customCover.length < 140000) ? fields.customCover : '',
        customBanner: (fields.customBanner && fields.customBanner.length < 180000) ? fields.customBanner : '',
        bannerFocalX: fields.bannerFocalX,
        bannerFocalY: fields.bannerFocalY,
        bannerZoom: fields.bannerZoom,
        artworkRole: fields.artworkRole
      };
      if (book.id) map[String(book.id)] = lightFields;
      if (book.title) map['t_' + String(book.title).trim().toLowerCase()] = lightFields;
      writeStorage(ARTWORK_MAP_KEY, JSON.stringify(map));
    } catch (_) {}

    // 3. Sync lightweight metadata list + active React history
    try {
      const rawMeta = readStorage('gemini_web_import_history_meta');
      if (rawMeta) {
        const list = JSON.parse(rawMeta);
        if (Array.isArray(list)) {
          const nextList = list.map(function (item) {
            if (!item) return item;
            const matchId = book.id && item.id === book.id;
            const matchTitle = book.title && item.title && item.title.trim().toLowerCase() === book.title.trim().toLowerCase();
            if (!matchId && !matchTitle) return item;
            return Object.assign({}, item, {
              customCover: (fields.customCover && fields.customCover.length < 60000) ? fields.customCover : item.customCover,
              customBanner: (fields.customBanner && fields.customBanner.length < 60000) ? fields.customBanner : item.customBanner,
              bannerFocalX: fields.bannerFocalX,
              bannerFocalY: fields.bannerFocalY,
              bannerZoom: fields.bannerZoom,
              artworkRole: fields.artworkRole
            });
          });
          writeStorage('gemini_web_import_history_meta', JSON.stringify(nextList));
        }
      }
    } catch (_) {}

    if (typeof cb.setWebImportHistory === 'function') {
      cb.setWebImportHistory(function (prev) {
        return (prev || []).map(function (b) {
          if (!b) return b;
          const matchId = book.id && b.id === book.id;
          const matchTitle = book.title && b.title && b.title.trim().toLowerCase() === book.title.trim().toLowerCase();
          return (matchId || matchTitle) ? Object.assign({}, b, fields) : b;
        });
      });
    }

    notifySubscribers(getPrefs());
    return updatedBook;
  }

  try {
    init();
  } catch (_) {}

  const OmniThemeEngine = {
    PALETTES: PALETTES,
    PREF_SCHEMA: PREF_SCHEMA,
    PREF_KEYS: PREF_KEYS,
    getPrefs: getPrefs,
    getPalette: getPalette,
    setPref: setPref,
    setPrefs: setPrefs,
    resetPrefs: resetPrefs,
    reload: reload,
    init: init,
    subscribe: subscribe,
    useOmniPrefs: useOmniPrefs,
    pickOnAccent: pickOnAccent,
    sanitizeHex: sanitizeHex
  };

  const ArtworkModelResolver = {
    ARTWORK_MAP_KEY: ARTWORK_MAP_KEY,
    getArtworkKey: getArtworkKey,
    getArtworkMap: getArtworkMap,
    mergeBookArtwork: mergeBookArtwork,
    preferredCover: preferredCover,
    preferredBanner: preferredBanner,
    getBannerImgStyle: getBannerImgStyle,
    compressImageDataUrl: compressImageDataUrl,
    saveBookArtwork: saveBookArtwork
  };

  return {
    OmniThemeEngine: OmniThemeEngine,
    ArtworkModelResolver: ArtworkModelResolver
  };
}));
