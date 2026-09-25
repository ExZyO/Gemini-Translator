/**
 * Gemini EPUB Translator - Novel Enrichment Engine
 * Module: novel_enrichment_engine.js
 * 
 * Provides:
 * - Token & Cost Estimation for translation across multiple models and stream counts
 * - Online Metadata Enrichment (AniList GraphQL & Kitsu fallback)
 * - Arc & Volume Splitter packaging with EPUB generation
 * - QA Health Audit delegation
 * - Source Plugin Registry integration & live novel search
 * - Translation Memory & Chapter Revision Snapshot management
 */

(function (global) {
  'use strict';

  function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  }

  /**
   * 1. Cost & Token Estimator
   */
  function calculateCostEstimate(params = {}) {
    let chs = (params.chapters && params.chapters.length > 0) ? params.chapters : [];
    let totalChars = 0;
    let totalWords = 0;

    if (chs.length > 0) {
      for (const c of chs) {
        const t = (typeof c === 'string' ? c : (c?.text || c?.content || ''));
        totalChars += t.length;
        totalWords += t.split(/\s+/).filter(Boolean).length;
      }
    } else if (params.inputText && params.inputText.trim()) {
      totalChars = params.inputText.length;
      totalWords = params.inputText.split(/\s+/).filter(Boolean).length;
      chs = [{ title: 'Current Text', content: params.inputText }];
    }

    if (totalChars === 0) {
      return null;
    }

    const estSourceTokens = Math.round(totalChars / 2.8);
    const glossaryTermsActive = params.glossaryTermCount || 0;
    const estGlossaryTokens = params.smartGlossary
      ? Math.min(chs.length * 40, glossaryTermsActive * 12)
      : (glossaryTermsActive * 15);
    const estGenderTokens = Object.keys(params.genderLocks || {}).length * 8;
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

    return {
      chapterCount: chs.length,
      totalChars,
      totalWords,
      estSourceTokens,
      totalPromptTokens,
      totalOutputTokens,
      totalTokens,
      models: calculatedModels,
      timeTiers
    };
  }

  /**
   * 2. Online Metadata Fetcher (AniList GraphQL with Kitsu Fallback)
   */
  async function fetchNovelMetadata(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') return null;
    const baseTitle = rawTitle.replace(/\s*\(Translated\)\s*$/i, '').trim();
    const cleanQuery = baseTitle
      .replace(/\s*[-—~|:]\s*(?:Web Novel Complete Edition|Complete Edition|Web Novel|Arc Edition|Starting Life in Another World|Lnori|Syosetu|NovelBuddy|RoyalRoad|Witch Cult).*$/i, '')
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .trim() || baseTitle;

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
            title: media.title?.english || media.title?.romaji || media.title?.native || baseTitle,
            cover: media.coverImage?.extraLarge || media.coverImage?.large || '',
            summary: (media.description || '').replace(/<[^>]*>/g, '').trim(),
            genres: Array.isArray(media.genres) ? media.genres : [],
            rating: media.averageScore,
            id: media.id,
            sourceProvider: 'AniList'
          };
        }
      }
    } catch (_) {
      // Fallback to secondary catalog provider
    }

    // 2. High-Availability Fallback: Kitsu API
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
              id: kData?.data?.[0]?.id,
              sourceProvider: 'Kitsu / Manga Catalog'
            };
          }
        }
      } catch (_) {}
    }

    return metadata;
  }

  /**
   * 3. Apply Enriched Metadata
   */
  async function applyEnrichedMetadata(novelRecord, metadata, callbacks = {}) {
    if (!novelRecord || !metadata) return null;
    const bestTitle = metadata.title;
    const coverUrl = metadata.cover;
    const summary = metadata.summary;
    const genres = metadata.genres || [];

    const confirmMsg = `Found metadata via ${metadata.sourceProvider || 'Metadata Provider'}:\n\nTitle: ${bestTitle}\nGenres: ${(genres || []).join(', ') || 'None'}\nRating: ${metadata.rating ? metadata.rating + '%' : 'N/A'}\n\nApply enriched cover art, synopsis, and tags to this novel?`;

    const shouldApply = typeof callbacks.confirm === 'function'
      ? await callbacks.confirm(confirmMsg)
      : (typeof confirm !== 'undefined' ? confirm(confirmMsg) : true);

    if (!shouldApply) return null;

    const updates = {
      enrichedTitle: bestTitle,
      cover: coverUrl || novelRecord.cover,
      summary: summary || novelRecord.summary,
      genres: genres,
      metadataId: metadata.id,
      rating: metadata.rating
    };

    const db = (typeof window !== 'undefined' && window.novelDB) || null;
    if (db && novelRecord.id && db.novels && typeof db.novels.update === 'function') {
      try {
        await db.novels.update(novelRecord.id, updates);
      } catch (e) {
        console.warn('[NovelEnrichmentEngine] DB update warning:', e);
      }
    }

    if (typeof callbacks.onUpdateHistory === 'function') {
      callbacks.onUpdateHistory(updates);
    }
    if (typeof callbacks.onUpdateActiveNovelView === 'function') {
      callbacks.onUpdateActiveNovelView(updates);
    }

    return updates;
  }

  /**
   * 4. Package Novel for Arc Splitter
   */
  async function packageNovelForArcSplitter(fullNovel, callbacks = {}) {
    if (!fullNovel) {
      if (callbacks.toast) callbacks.toast('Novel data not found in database.', 'error');
      return null;
    }
    const chs = (fullNovel.translatedChapters && fullNovel.translatedChapters.length > 0)
      ? fullNovel.translatedChapters
      : (fullNovel.rawChapters || fullNovel.chapters || []);
    if (chs.length === 0) {
      if (callbacks.toast) callbacks.toast('No chapters available to split.', 'warning');
      return null;
    }

    const cleanTitleFn = callbacks.cleanBookTitle || (typeof window !== 'undefined' && window.cleanBookTitle);
    const cleanAuthorFn = callbacks.cleanBookAuthor || (typeof window !== 'undefined' && window.cleanBookAuthor);
    const genEpubFn = callbacks.generateEpubFromChapters || (typeof window !== 'undefined' && window.generateEpubFromChapters);
    const sanitizeFn = callbacks.sanitizeFilename || (typeof window !== 'undefined' && window.sanitizeFilename);

    const novelTitle = (typeof cleanTitleFn === 'function' ? cleanTitleFn(fullNovel.title, chs) : (fullNovel.title || 'Novel')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();
    const novelAuthor = (typeof cleanAuthorFn === 'function' ? cleanAuthorFn(fullNovel.author) : (fullNovel.author || 'Author')).replace(/\s*[-|]\s*Lnori\s*$/i, '').trim();

    if (typeof genEpubFn !== 'function') {
      throw new Error('generateEpubFromChapters is not available');
    }

    const blob = await genEpubFn(chs, novelTitle, novelAuthor, fullNovel.targetLang || 'en');
    const safeName = (typeof sanitizeFn === 'function' ? sanitizeFn(novelTitle) : novelTitle.replace(/[^a-zA-Z0-9_-]/g, '_')) || 'Novel';
    const file = new File([blob], `${safeName}.epub`, { type: 'application/epub+zip' });

    setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.processSplitFile === 'function') {
        window.processSplitFile(file);
        if (callbacks.toast) callbacks.toast(`Loaded "${novelTitle}" (${chs.length} chapters) into Volume Splitter!`, 'success');
      }
    }, 250);

    return { file, novelTitle, chapterCount: chs.length };
  }

  /**
   * 5. Audit Novel Health Delegation
   */
  function auditNovelHealth(novelOrChapters, options = {}) {
    const qa = (typeof window !== 'undefined' && window.QAEngine) || (typeof global !== 'undefined' && global.QAEngine);
    if (!qa || typeof qa.auditNovel !== 'function') {
      console.warn('[NovelEnrichmentEngine] QAEngine is not loaded.');
      return null;
    }
    return qa.auditNovel(novelOrChapters, options);
  }

  /**
   * 6. Plugins Sub-system
   */
  async function searchNovels(query, sourceId = 'all') {
    const q = (query || '').trim();
    if (!q) return [];
    const reg = (typeof window !== 'undefined' && (window.sourceRegistry || window.SourceRegistry)) || null;
    let results = [];
    if (sourceId && sourceId !== 'all' && reg && typeof reg.searchPlugin === 'function') {
      results = await reg.searchPlugin(sourceId, q);
    } else {
      const promises = [];
      if (reg && typeof reg.searchAll === 'function') {
        promises.push(reg.searchAll(q).catch(e => { console.warn('[searchAll]', e); return []; }));
      }
      const importer = (typeof window !== 'undefined' && window.WebNovelImporter) || null;
      if (importer && typeof importer.searchNovels === 'function') {
        promises.push(importer.searchNovels(q, 'all').catch(e => { console.warn('[importerSearch]', e); return []; }));
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
    return results || [];
  }

  async function checkRezeroUpdates(options = {}, callbacks = {}) {
    const wctUrl = options.url || 'https://witchculttranslation.com/table-of-content/';
    if (callbacks.onSetWebImportUrl) {
      callbacks.onSetWebImportUrl(wctUrl);
    }
    if (callbacks.toast) {
      callbacks.toast('Checking source for new chapters…', 'info');
    }

    const existing = options.existingNovel || null;
    const existingChapters = options.existingChapters || [];

    const importer = (typeof window !== 'undefined' && window.WebNovelImporter) || null;
    if (!importer || typeof importer.importUrl !== 'function') {
      if (callbacks.toast) callbacks.toast('Web Importer engine not loaded.', 'error');
      return null;
    }

    if (callbacks.onProgress) callbacks.onProgress('Scanning live Table of Contents…');
    const tocResult = await importer.importUrl(wctUrl, (msg) => {
      if (callbacks.onProgress) callbacks.onProgress(msg);
    }, { tocOnly: true });

    const remoteList = tocResult?.chapterList || (tocResult?.chapters && tocResult.chapters.length > 0 ? tocResult.chapters : []);
    if (!remoteList || remoteList.length === 0) {
      if (callbacks.toast) callbacks.toast('Could not scan chapter list. Check network connection.', 'warning');
      return null;
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
      if (callbacks.toast) callbacks.toast(`Chapters are 100% up to date! All ${existingChapters.length} chapters downloaded.`, 'success');
      if (callbacks.onProgress) callbacks.onProgress('');
      return { upToDate: true, total: existingChapters.length };
    }

    if (existingChapters.length === 0) {
      if (callbacks.toast) callbacks.toast(`Discovered ${remoteList.length} chapters. Starting ingestion…`, 'info');
      if (callbacks.onStartFetch) callbacks.onStartFetch(false, null, false, wctUrl);
      return { startingFull: true, total: remoteList.length };
    }

    if (callbacks.toast) callbacks.toast(`Found ${newChapters.length} new chapters! Downloading incrementally…`, 'success');
    const payload = {
      id: existing?.id,
      url: wctUrl,
      sourceUrl: wctUrl,
      title: options.title || existing?.title || 'Web Novel Series (WCT)',
      author: options.author || existing?.author || 'Author',
      cover: options.cover || existing?.cover || 'https://witchculttranslation.com/wp-content/uploads/2024/09/png-echidna-beatrice-2-editado-2.jpg',
      chapters: existingChapters,
      rawChapters: existingChapters,
      totalChapterCount: remoteList.length
    };
    if (callbacks.onStartFetch) callbacks.onStartFetch(true, payload, false, wctUrl);
    return { incremental: true, newCount: newChapters.length, total: remoteList.length };
  }

  const Plugins = {
    fetchCatalog: async function () {
      const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
      if (reg && typeof reg.fetchCatalog === 'function') {
        return await reg.fetchCatalog();
      }
      return [];
    },
    installPlugin: async function (item) {
      const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
      if (!reg || typeof reg.loadPluginById !== 'function') throw new Error('Source registry not loaded');
      return await reg.loadPluginById(item.id);
    },
    uninstallPlugin: function (id) {
      const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
      if (!reg || typeof reg.unregister !== 'function') return false;
      return reg.unregister(id);
    },
    installCustomPluginUrl: async function (url) {
      const reg = (typeof window !== 'undefined' && window.sourceRegistry) || null;
      if (!reg || typeof reg.loadPluginFromUrl !== 'function') throw new Error('Source registry not loaded');
      return await reg.loadPluginFromUrl(url);
    },
    searchNovels: searchNovels,
    checkRezeroUpdates: checkRezeroUpdates
  };

  /**
   * 7. Translation Memory & Snapshots Sub-system
   */
  async function refreshStats() {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM || typeof engine.TM.getStats !== 'function') return null;
    return await engine.TM.getStats();
  }

  async function clearTM() {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM || typeof engine.TM.clearTM !== 'function') return false;
    return await engine.TM.clearTM();
  }

  async function exportTMX(filename) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.TM) throw new Error('TMDiffEngine not loaded');
    const tmx = await engine.TM.exportTMX();
    if (typeof document !== 'undefined') {
      const blob = new Blob([tmx], { type: 'application/xml;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `translation_memory_${new Date().toISOString().slice(0, 10)}.tmx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return tmx;
  }

  async function getChapterSnapshots(novelKey, chapterIdx) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.getChapterSnapshots !== 'function') return [];
    return await engine.Snapshots.getChapterSnapshots(novelKey, chapterIdx);
  }

  async function createSnapshot(data) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.createSnapshot !== 'function') return null;
    return await engine.Snapshots.createSnapshot(data);
  }

  function computeDiff(oldText, newText) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.computeDiff !== 'function') {
      return { oldText, newText, diff: [] };
    }
    return engine.Snapshots.computeDiff(oldText, newText);
  }

  async function rollbackSnapshot(snapId) {
    const engine = (typeof window !== 'undefined' && window.TMDiffEngine) || null;
    if (!engine || !engine.Snapshots || typeof engine.Snapshots.rollbackSnapshot !== 'function') return null;
    return await engine.Snapshots.rollbackSnapshot(snapId);
  }

  const TM = {
    refreshStats,
    clearTM,
    exportTMX,
    getChapterSnapshots,
    createSnapshot,
    computeDiff,
    rollbackSnapshot
  };

  const NovelEnrichmentEngine = {
    calculateCostEstimate,
    fetchNovelMetadata,
    applyEnrichedMetadata,
    packageNovelForArcSplitter,
    auditNovelHealth,
    Plugins,
    TM
  };

  global.NovelEnrichmentEngine = NovelEnrichmentEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NovelEnrichmentEngine;
  }
})(typeof window !== 'undefined' ? window : this);
